"""DB helpers for onyx_vault* tables.

Pure DB layer — no FastAPI, no httpx. All functions take a
Session and return ORM objects or scalars.
"""
from __future__ import annotations

from typing import Sequence
from uuid import UUID

from sqlalchemy import delete
from sqlalchemy import func
from sqlalchemy import select
from sqlalchemy import update
from sqlalchemy.orm import Session

from onyx.db.models import User
from onyx.db.models import Vault
from onyx.db.models import VaultMember
from onyx.server.vaults.schemas import VaultRole
from onyx.server.vaults.schemas import VaultVisibility


# --- Vault CRUD ----------------------------------------------------------


def insert_vault(
    db: Session,
    *,
    rag_tenant_id: str,
    display_name: str,
    description: str | None,
    visibility: VaultVisibility,
    owner_user_id: UUID,
    storage_quota_mb: int,
) -> Vault:
    v = Vault(
        rag_tenant_id=rag_tenant_id,
        display_name=display_name,
        description=description,
        visibility=visibility.value,
        owner_user_id=owner_user_id,
        storage_quota_mb=storage_quota_mb,
    )
    db.add(v)
    db.flush()
    return v


def get_vault_by_id(db: Session, vault_id: UUID) -> Vault | None:
    return db.execute(select(Vault).where(Vault.id == vault_id)).scalar_one_or_none()


def update_vault_fields(
    db: Session,
    vault_id: UUID,
    *,
    display_name: str | None = None,
    description: str | None = None,
    visibility: VaultVisibility | None = None,
) -> None:
    values: dict[str, object] = {"updated_at": func.now()}
    if display_name is not None:
        values["display_name"] = display_name
    if description is not None:
        values["description"] = description
    if visibility is not None:
        values["visibility"] = visibility.value
    if len(values) == 1:
        return
    db.execute(update(Vault).where(Vault.id == vault_id).values(**values))


def soft_delete_vault(db: Session, vault_id: UUID) -> None:
    db.execute(
        update(Vault)
        .where(Vault.id == vault_id)
        .values(deleted_at=func.now(), updated_at=func.now())
    )


def hard_delete_vault(db: Session, vault_id: UUID) -> None:
    db.execute(delete(Vault).where(Vault.id == vault_id))


def increment_delete_retry(db: Session, vault_id: UUID) -> int:
    res = db.execute(
        update(Vault)
        .where(Vault.id == vault_id)
        .values(delete_retry_count=Vault.delete_retry_count + 1)
        .returning(Vault.delete_retry_count)
    )
    return int(res.scalar_one())


def list_vaults_pending_delete(db: Session, *, max_retries: int) -> Sequence[Vault]:
    rows = (
        db.execute(
            select(Vault).where(
                Vault.deleted_at.isnot(None), Vault.delete_retry_count < max_retries
            )
        )
        .scalars()
        .all()
    )
    return rows


def list_vaults_for_user(
    db: Session, user: User
) -> tuple[Sequence[Vault], Sequence[Vault], Sequence[Vault]]:
    """Return (owned, collaborator_of, workspace_visible_only).

    Same-tenant filter is enforced by ONYX session middleware (the db
    session is already scoped). visibility='workspace' rows that the
    user is also a member of are returned in the collaborator bucket
    only — never duplicated.
    """
    owned = (
        db.execute(
            select(Vault)
            .where(Vault.owner_user_id == user.id, Vault.deleted_at.is_(None))
            .order_by(Vault.updated_at.desc())
        )
        .scalars()
        .all()
    )

    member_vault_ids = (
        db.execute(select(VaultMember.vault_id).where(VaultMember.user_id == user.id))
        .scalars()
        .all()
    )
    collaborator = (
        db.execute(
            select(Vault)
            .where(
                Vault.id.in_(member_vault_ids),
                Vault.owner_user_id != user.id,
                Vault.deleted_at.is_(None),
            )
            .order_by(Vault.updated_at.desc())
        )
        .scalars()
        .all()
    )

    workspace = (
        db.execute(
            select(Vault)
            .where(
                Vault.visibility == "workspace",
                Vault.owner_user_id != user.id,
                ~Vault.id.in_(member_vault_ids),
                Vault.deleted_at.is_(None),
            )
            .order_by(Vault.updated_at.desc())
        )
        .scalars()
        .all()
    )

    return owned, collaborator, workspace


# --- Member CRUD ---------------------------------------------------------


def insert_member(
    db: Session, vault_id: UUID, user_id: UUID, role: VaultRole
) -> None:
    db.add(VaultMember(vault_id=vault_id, user_id=user_id, role=role.value))
    db.flush()


def remove_member(db: Session, vault_id: UUID, user_id: UUID) -> bool:
    res = db.execute(
        delete(VaultMember)
        .where(VaultMember.vault_id == vault_id, VaultMember.user_id == user_id)
        .returning(VaultMember.user_id)
    )
    return res.scalar_one_or_none() is not None


def list_members(db: Session, vault_id: UUID) -> Sequence[VaultMember]:
    return (
        db.execute(
            select(VaultMember)
            .where(VaultMember.vault_id == vault_id)
            .order_by(VaultMember.granted_at)
        )
        .scalars()
        .all()
    )


def get_member_role(
    db: Session, vault_id: UUID, user_id: UUID
) -> VaultRole | None:
    row = db.execute(
        select(VaultMember.role).where(
            VaultMember.vault_id == vault_id, VaultMember.user_id == user_id
        )
    ).scalar_one_or_none()
    return VaultRole(row) if row else None


# --- ACL ----------------------------------------------------------------


def compute_effective_role(
    db: Session, user: User, vault: Vault
) -> VaultRole | None:
    """Return the highest role this user has on this vault, or None.

    1. If user is the owner column, COLLABORATOR is upgraded to OWNER.
    2. Else if user is in member table, return that role.
    3. Else if vault.visibility == 'workspace' and same tenant
       (enforced by session middleware), return READER.
    4. Else None.
    """
    if vault.owner_user_id == user.id:
        return VaultRole.OWNER
    member_role = get_member_role(db, vault.id, user.id)
    if member_role is not None:
        return member_role
    if vault.visibility == VaultVisibility.WORKSPACE.value:
        return VaultRole.READER
    return None
