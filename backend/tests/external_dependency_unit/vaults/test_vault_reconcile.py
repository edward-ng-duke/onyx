"""Reconcile worker behavior — mock RAG client, real Postgres."""
from contextlib import contextmanager
from unittest.mock import MagicMock
from unittest.mock import patch
from uuid import uuid4

from sqlalchemy.orm import Session

from onyx.db.vault import get_vault_by_id
from onyx.db.vault import insert_vault
from onyx.db.vault import soft_delete_vault
from onyx.server.vaults.schemas import VaultVisibility
from tests.external_dependency_unit.conftest import create_test_user


def _patched_session_cm(db_session: Session):
    @contextmanager
    def _cm():
        yield db_session

    return _cm


def test_reconcile_succeeds_then_hard_deletes(db_session: Session) -> None:
    user = create_test_user(db_session, email_prefix="vault_reconcile_ok")
    v = insert_vault(
        db_session,
        rag_tenant_id=f"onyx-{uuid4()}",
        display_name="X",
        description=None,
        visibility=VaultVisibility.PRIVATE,
        owner_user_id=user.id,
        storage_quota_mb=1024,
    )
    soft_delete_vault(db_session, v.id)
    db_session.commit()
    vault_id = v.id

    with patch(
        "onyx.background.celery.tasks.vault_reconcile.tasks.RagAnythingClient"
    ) as mock_client_cls:
        mock_client_cls.return_value.delete_kb = MagicMock(return_value=None)
        with patch(
            "onyx.background.celery.tasks.vault_reconcile.tasks.get_session_with_current_tenant",
            _patched_session_cm(db_session),
        ):
            from onyx.background.celery.tasks.vault_reconcile.tasks import _run

            _run()

    assert get_vault_by_id(db_session, vault_id) is None  # hard-deleted


def test_reconcile_failure_increments_retry(db_session: Session) -> None:
    user = create_test_user(db_session, email_prefix="vault_reconcile_fail")
    v = insert_vault(
        db_session,
        rag_tenant_id=f"onyx-{uuid4()}",
        display_name="X",
        description=None,
        visibility=VaultVisibility.PRIVATE,
        owner_user_id=user.id,
        storage_quota_mb=1024,
    )
    soft_delete_vault(db_session, v.id)
    db_session.commit()
    vault_id = v.id

    with patch(
        "onyx.background.celery.tasks.vault_reconcile.tasks.RagAnythingClient"
    ) as mock_client_cls:
        mock_client_cls.return_value.delete_kb = MagicMock(
            side_effect=RuntimeError("boom")
        )
        with patch(
            "onyx.background.celery.tasks.vault_reconcile.tasks.get_session_with_current_tenant",
            _patched_session_cm(db_session),
        ):
            from onyx.background.celery.tasks.vault_reconcile.tasks import _run

            _run()

    re = get_vault_by_id(db_session, vault_id)
    assert re is not None
    assert re.delete_retry_count == 1
