from uuid import uuid4

from sqlalchemy.orm import Session

from onyx.db.models import User
from onyx.db.vault import compute_effective_role
from onyx.db.vault import get_vault_by_id
from onyx.db.vault import hard_delete_vault
from onyx.db.vault import insert_member
from onyx.db.vault import insert_vault
from onyx.db.vault import soft_delete_vault
from onyx.server.vaults.schemas import VaultRole
from onyx.server.vaults.schemas import VaultVisibility


def test_insert_then_get_vault(db_session: Session, test_user: User) -> None:
    v = insert_vault(
        db_session,
        rag_tenant_id=f"onyx-{uuid4()}",
        display_name="Engineering",
        description=None,
        visibility=VaultVisibility.PRIVATE,
        owner_user_id=test_user.id,
        storage_quota_mb=1024,
    )
    db_session.commit()
    fetched = get_vault_by_id(db_session, v.id)
    assert fetched is not None
    assert fetched.display_name == "Engineering"
    assert fetched.deleted_at is None


def test_compute_effective_role_owner_via_member(
    db_session: Session, test_user: User
) -> None:
    v = insert_vault(
        db_session,
        rag_tenant_id=f"onyx-{uuid4()}",
        display_name="V",
        description=None,
        visibility=VaultVisibility.PRIVATE,
        owner_user_id=test_user.id,
        storage_quota_mb=1024,
    )
    insert_member(db_session, v.id, test_user.id, VaultRole.OWNER)
    db_session.commit()
    role = compute_effective_role(db_session, test_user, v)
    assert role == VaultRole.OWNER


def test_compute_effective_role_workspace_implicit_reader(
    db_session: Session, test_user: User, other_user_same_tenant: User
) -> None:
    """Same-tenant user with no member row gets implicit READER on workspace-visible vault."""
    v = insert_vault(
        db_session,
        rag_tenant_id=f"onyx-{uuid4()}",
        display_name="V",
        description=None,
        visibility=VaultVisibility.WORKSPACE,
        owner_user_id=test_user.id,
        storage_quota_mb=1024,
    )
    db_session.commit()
    role = compute_effective_role(db_session, other_user_same_tenant, v)
    assert role == VaultRole.READER


def test_compute_effective_role_private_non_member_returns_none(
    db_session: Session, test_user: User, stranger_user: User
) -> None:
    v = insert_vault(
        db_session,
        rag_tenant_id=f"onyx-{uuid4()}",
        display_name="V",
        description=None,
        visibility=VaultVisibility.PRIVATE,
        owner_user_id=test_user.id,
        storage_quota_mb=1024,
    )
    db_session.commit()
    role = compute_effective_role(db_session, stranger_user, v)
    assert role is None


def test_soft_then_hard_delete(db_session: Session, test_user: User) -> None:
    v = insert_vault(
        db_session,
        rag_tenant_id=f"onyx-{uuid4()}",
        display_name="V",
        description=None,
        visibility=VaultVisibility.PRIVATE,
        owner_user_id=test_user.id,
        storage_quota_mb=1024,
    )
    db_session.commit()
    soft_delete_vault(db_session, v.id)
    db_session.commit()
    re = get_vault_by_id(db_session, v.id)
    assert re is not None
    assert re.deleted_at is not None
    hard_delete_vault(db_session, v.id)
    db_session.commit()
    assert get_vault_by_id(db_session, v.id) is None
