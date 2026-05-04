"""ACL dependency factory for /api/onyx/vaults/* routes."""
from __future__ import annotations

from uuid import UUID

from fastapi import Depends
from sqlalchemy.orm import Session

from onyx.auth.users import current_user
from onyx.db.engine.sql_engine import get_session
from onyx.db.models import User, Vault
from onyx.db.vault import compute_effective_role, get_vault_by_id
from onyx.error_handling.error_codes import OnyxErrorCode
from onyx.error_handling.exceptions import OnyxError
from onyx.server.vaults.schemas import VaultRole

_RANK = {VaultRole.READER: 0, VaultRole.COLLABORATOR: 1, VaultRole.OWNER: 2}


def _role_geq(actual: VaultRole, minimum: VaultRole) -> bool:
    return _RANK[actual] >= _RANK[minimum]


def require_vault_role(min_role: VaultRole = VaultRole.READER):
    def _dep(
        vault_id: UUID,
        user: User = Depends(current_user),
        db: Session = Depends(get_session),
    ) -> Vault:
        vault = get_vault_by_id(db, vault_id)
        if vault is None or vault.deleted_at is not None:
            raise OnyxError(OnyxErrorCode.NOT_FOUND, "Vault not found")
        effective = compute_effective_role(db, user, vault)
        if effective is None or not _role_geq(effective, min_role):
            raise OnyxError(OnyxErrorCode.NOT_FOUND, "Vault not found")
        return vault

    return _dep
