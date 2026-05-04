"""ONYX-side proxy router for /api/onyx/vaults.

This module owns ACL, RAG roundtrip, and chat-history persistence.
"""
from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.orm import Session

from onyx.auth.users import current_user
from onyx.db.engine.sql_engine import get_session
from onyx.db.models import User, Vault
from onyx.db.vault import (
    compute_effective_role,
    get_member_role,
    get_vault_by_id,
    hard_delete_vault,
    increment_delete_retry,
    insert_member,
    insert_vault,
    list_members,
    list_vaults_for_user,
    remove_member,
    soft_delete_vault,
    update_vault_fields,
)
from onyx.error_handling.error_codes import OnyxErrorCode
from onyx.error_handling.exceptions import OnyxError
from onyx.server.vaults.acl import require_vault_role
from onyx.server.vaults.chat_history import add_assistant_message
from onyx.server.vaults.chat_history import add_user_message
from onyx.server.vaults.chat_history import get_session as ch_get_session
from onyx.server.vaults.rag_client import RagAnythingClient
from onyx.server.vaults.schemas import (
    AddMemberRequest,
    CreateVaultRequest,
    MemberResponse,
    UpdateVaultRequest,
    VaultBrief,
    VaultChatSendRequest,
    VaultDetail,
    VaultListResponse,
    VaultRole,
    VaultVisibility,
)

router = APIRouter(prefix="/api/onyx/vaults", tags=["vaults"])

# Single per-process client. Cheap: HttpxPool memoizes the underlying httpx.
_rag = RagAnythingClient()


def _to_brief(
    v: Vault,
    *,
    document_count: int,
    storage_used_mb: float,
    effective_role: VaultRole,
) -> VaultBrief:
    return VaultBrief(
        id=v.id,
        display_name=v.display_name,
        description=v.description,
        visibility=VaultVisibility(v.visibility),
        owner_user_id=v.owner_user_id,
        document_count=document_count,
        storage_used_mb=storage_used_mb,
        storage_quota_mb=v.storage_quota_mb,
        effective_role=effective_role,
        created_at=v.created_at,
        updated_at=v.updated_at,
    )


@router.post("", status_code=201)
def create_vault(
    body: CreateVaultRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_session),
) -> VaultDetail:
    rag_resp = _rag.create_kb(
        display_name=body.display_name,
        onyx_workspace_id=str(user.workspace_id)
        if getattr(user, "workspace_id", None)
        else None,
        onyx_owner_user_id=str(user.id),
        storage_quota_mb=body.storage_quota_mb,
        user_id=user.id,
    )
    rag_tenant_id = rag_resp["kb_id"]
    v = insert_vault(
        db,
        rag_tenant_id=rag_tenant_id,
        display_name=body.display_name,
        description=body.description,
        visibility=body.visibility,
        owner_user_id=user.id,
        storage_quota_mb=body.storage_quota_mb,
    )
    insert_member(db, v.id, user.id, VaultRole.OWNER)
    db.commit()
    return VaultDetail(
        id=v.id,
        rag_tenant_id=v.rag_tenant_id,
        display_name=v.display_name,
        description=v.description,
        visibility=VaultVisibility(v.visibility),
        owner_user_id=v.owner_user_id,
        document_count=int(rag_resp.get("document_count", 0)),
        storage_used_mb=float(rag_resp.get("storage_used_mb", 0.0)),
        storage_quota_mb=v.storage_quota_mb,
        effective_role=VaultRole.OWNER,
        created_at=v.created_at,
        updated_at=v.updated_at,
    )


@router.get("")
def list_vaults(
    user: User = Depends(current_user),
    db: Session = Depends(get_session),
) -> VaultListResponse:
    owned, collaborator, workspace = list_vaults_for_user(db, user)

    def _enrich(vaults: object, role: VaultRole) -> list[VaultBrief]:
        out: list[VaultBrief] = []
        for v in vaults:  # type: ignore[union-attr]
            try:
                rag = _rag.get_kb(v.rag_tenant_id, user_id=user.id)
                out.append(
                    _to_brief(
                        v,
                        document_count=int(rag.get("document_count", 0)),
                        storage_used_mb=float(rag.get("storage_used_mb", 0.0)),
                        effective_role=role,
                    )
                )
            except OnyxError:
                # RAG-side gone — still surface the local row so user can delete.
                out.append(
                    _to_brief(
                        v,
                        document_count=0,
                        storage_used_mb=0.0,
                        effective_role=role,
                    )
                )
        return out

    return VaultListResponse(
        owned=_enrich(owned, VaultRole.OWNER),
        collaborator=_enrich(collaborator, VaultRole.COLLABORATOR),
        workspace=_enrich(workspace, VaultRole.READER),
    )


@router.get("/{vault_id}")
def get_vault(
    vault: Vault = Depends(require_vault_role(VaultRole.READER)),
    user: User = Depends(current_user),
    db: Session = Depends(get_session),
) -> VaultDetail:
    rag = _rag.get_kb(vault.rag_tenant_id, user_id=user.id)
    role = compute_effective_role(db, user, vault) or VaultRole.READER
    return VaultDetail(
        id=vault.id,
        rag_tenant_id=vault.rag_tenant_id,
        display_name=vault.display_name,
        description=vault.description,
        visibility=VaultVisibility(vault.visibility),
        owner_user_id=vault.owner_user_id,
        document_count=int(rag.get("document_count", 0)),
        storage_used_mb=float(rag.get("storage_used_mb", 0.0)),
        storage_quota_mb=vault.storage_quota_mb,
        effective_role=role,
        created_at=vault.created_at,
        updated_at=vault.updated_at,
    )


@router.patch("/{vault_id}")
def update_vault(
    body: UpdateVaultRequest,
    vault: Vault = Depends(require_vault_role(VaultRole.OWNER)),
    user: User = Depends(current_user),
    db: Session = Depends(get_session),
) -> VaultDetail:
    update_vault_fields(
        db,
        vault.id,
        display_name=body.display_name,
        description=body.description,
        visibility=body.visibility,
    )
    db.commit()
    # Re-fetch updated row
    refreshed = get_vault_by_id(db, vault.id)
    assert refreshed is not None
    rag = _rag.get_kb(refreshed.rag_tenant_id, user_id=user.id)
    role = compute_effective_role(db, user, refreshed) or VaultRole.READER
    return VaultDetail(
        id=refreshed.id,
        rag_tenant_id=refreshed.rag_tenant_id,
        display_name=refreshed.display_name,
        description=refreshed.description,
        visibility=VaultVisibility(refreshed.visibility),
        owner_user_id=refreshed.owner_user_id,
        document_count=int(rag.get("document_count", 0)),
        storage_used_mb=float(rag.get("storage_used_mb", 0.0)),
        storage_quota_mb=refreshed.storage_quota_mb,
        effective_role=role,
        created_at=refreshed.created_at,
        updated_at=refreshed.updated_at,
    )


@router.delete("/{vault_id}", status_code=204)
def delete_vault(
    vault: Vault = Depends(require_vault_role(VaultRole.OWNER)),
    user: User = Depends(current_user),
    db: Session = Depends(get_session),
) -> None:
    # 1. soft-delete locally (user-visible "deleted" immediately)
    soft_delete_vault(db, vault.id)
    db.commit()
    # 2. try RAG cascade
    try:
        _rag.delete_kb(vault.rag_tenant_id, user_id=user.id)
    except OnyxError:
        increment_delete_retry(db, vault.id)
        db.commit()
        return
    # 3. hard-delete locally
    hard_delete_vault(db, vault.id)
    db.commit()


@router.get("/{vault_id}/members")
def list_vault_members(
    vault: Vault = Depends(require_vault_role(VaultRole.READER)),
    db: Session = Depends(get_session),
) -> list[MemberResponse]:
    rows = list_members(db, vault.id)
    return [
        MemberResponse(
            user_id=r.user_id, role=VaultRole(r.role), granted_at=r.granted_at
        )
        for r in rows
    ]


@router.post("/{vault_id}/members", status_code=201)
def add_vault_member(
    body: AddMemberRequest,
    vault: Vault = Depends(require_vault_role(VaultRole.OWNER)),
    db: Session = Depends(get_session),
) -> MemberResponse:
    if body.role == VaultRole.READER:
        raise OnyxError(
            OnyxErrorCode.INVALID_INPUT,
            "READER is implicit; add a collaborator or owner instead",
        )
    existing = get_member_role(db, vault.id, body.user_id)
    if existing is not None:
        raise OnyxError(OnyxErrorCode.INVALID_INPUT, "User already a member")
    insert_member(db, vault.id, body.user_id, body.role)
    db.commit()
    return MemberResponse(
        user_id=body.user_id,
        role=body.role,
        granted_at=datetime.now(timezone.utc),
    )


@router.delete("/{vault_id}/members/{user_id}", status_code=204)
def remove_vault_member(
    user_id: UUID,
    vault: Vault = Depends(require_vault_role(VaultRole.OWNER)),
    db: Session = Depends(get_session),
) -> None:
    if user_id == vault.owner_user_id:
        raise OnyxError(
            OnyxErrorCode.INVALID_INPUT, "Cannot remove the vault owner"
        )
    removed = remove_member(db, vault.id, user_id)
    if not removed:
        raise OnyxError(OnyxErrorCode.NOT_FOUND, "Member not found")
    db.commit()


@router.post("/{vault_id}/documents", status_code=202)
def upload_document(
    file: UploadFile = File(...),
    vault: Vault = Depends(require_vault_role(VaultRole.COLLABORATOR)),
    user: User = Depends(current_user),
) -> dict:
    contents = file.file.read()
    return _rag.upload_document(
        rag_tenant_id=vault.rag_tenant_id,
        file_bytes=contents,
        file_name=file.filename or "upload",
        mime_type=file.content_type or "application/octet-stream",
        user_id=user.id,
    )


@router.get("/{vault_id}/documents")
def list_documents(
    cursor: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    status_filter: str | None = Query(default=None, alias="status"),
    vault: Vault = Depends(require_vault_role(VaultRole.READER)),
    user: User = Depends(current_user),
) -> dict:
    return _rag.list_documents(
        rag_tenant_id=vault.rag_tenant_id,
        user_id=user.id,
        cursor=cursor,
        limit=limit,
        status_filter=status_filter,
    )


@router.get("/{vault_id}/documents/{document_id}")
def get_document(
    document_id: str,
    vault: Vault = Depends(require_vault_role(VaultRole.READER)),
    user: User = Depends(current_user),
) -> dict:
    return _rag.get_document(
        document_id,
        rag_tenant_id=vault.rag_tenant_id,
        user_id=user.id,
    )


@router.delete("/{vault_id}/documents/{document_id}", status_code=204)
def delete_document(
    document_id: str,
    vault: Vault = Depends(require_vault_role(VaultRole.COLLABORATOR)),
    user: User = Depends(current_user),
) -> None:
    _rag.delete_document(
        document_id,
        rag_tenant_id=vault.rag_tenant_id,
        user_id=user.id,
    )


@router.get("/{vault_id}/jobs/{job_id}")
def get_job(
    job_id: str,
    vault: Vault = Depends(require_vault_role(VaultRole.READER)),
    user: User = Depends(current_user),
) -> dict:
    return _rag.get_job(
        job_id, rag_tenant_id=vault.rag_tenant_id, user_id=user.id
    )


@router.post("/{vault_id}/query/sync")
def query_sync_endpoint(
    body: VaultChatSendRequest,
    vault: Vault = Depends(require_vault_role(VaultRole.READER)),
    user: User = Depends(current_user),
    db: Session = Depends(get_session),
) -> dict:
    rag_body = body.model_dump(exclude={"session_id"})
    upstream = _rag.query_sync(
        rag_tenant_id=vault.rag_tenant_id, body=rag_body, user_id=user.id,
    )
    if body.session_id is not None:
        sess = ch_get_session(db, session_id=body.session_id, user_id=user.id)
        if sess is not None:
            add_user_message(db, session_id=sess.id, content=body.question)
            add_assistant_message(
                db,
                session_id=sess.id,
                content=upstream.get("answer", ""),
                sources=upstream.get("sources"),
                tokens=upstream.get("tokens"),
                request_id=upstream.get("request_id"),
            )
            db.commit()
    return upstream
