"""ONYX-side proxy router for /api/onyx/vaults.

This module owns ACL, RAG roundtrip, and chat-history persistence.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from onyx.auth.users import current_user
from onyx.db.engine.sql_engine import get_session
from onyx.db.models import User, Vault
from onyx.db.vault import (
    compute_effective_role,
    get_vault_by_id,
    hard_delete_vault,
    increment_delete_retry,
    insert_member,
    insert_vault,
    list_vaults_for_user,
    soft_delete_vault,
    update_vault_fields,
)
from onyx.error_handling.exceptions import OnyxError
from onyx.server.vaults.acl import require_vault_role
from onyx.server.vaults.rag_client import RagAnythingClient
from onyx.server.vaults.schemas import (
    CreateVaultRequest,
    UpdateVaultRequest,
    VaultBrief,
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
