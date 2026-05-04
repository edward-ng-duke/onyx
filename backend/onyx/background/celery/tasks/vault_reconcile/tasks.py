"""Periodic worker: retry failed RAG-side cascade deletes.

Runs on the `vault_reconcile` queue (subscribed by the light worker)
every 60s. Picks up vaults that were soft-deleted but whose RAG
cascade failed; retries up to 5 times.
"""
from __future__ import annotations

import logging

from celery import shared_task

from onyx.configs.constants import OnyxCeleryTask
from onyx.db.engine.sql_engine import get_session_with_current_tenant
from onyx.db.vault import hard_delete_vault
from onyx.db.vault import increment_delete_retry
from onyx.db.vault import list_vaults_pending_delete
from onyx.server.metrics.vault_metrics import vault_reconcile_pending
from onyx.server.vaults.rag_client import RagAnythingClient

_log = logging.getLogger(__name__)
_MAX_RETRIES = 5
_TASK_SOFT_TIMEOUT = 120


def _run() -> int:
    """Returns count of vaults still pending after this pass."""
    rag = RagAnythingClient()
    pending_after = 0
    with get_session_with_current_tenant() as db:
        rows = list_vaults_pending_delete(db, max_retries=_MAX_RETRIES)
        for v in rows:
            try:
                rag.delete_kb(v.rag_tenant_id, user_id=v.owner_user_id)
                hard_delete_vault(db, v.id)
                db.commit()
            except Exception as e:  # noqa: BLE001
                count = increment_delete_retry(db, v.id)
                db.commit()
                _log.warning(
                    "vault_reconcile_retry vault_id=%s retry=%d error=%s",
                    str(v.id),
                    count,
                    str(e),
                )
                if count < _MAX_RETRIES:
                    pending_after += 1
    vault_reconcile_pending.set(pending_after)
    return pending_after


@shared_task(
    name=OnyxCeleryTask.VAULT_RECONCILE_FAILED_DELETES,
    ignore_result=True,
    soft_time_limit=_TASK_SOFT_TIMEOUT,
    trail=False,
    bind=True,
)
def vault_reconcile_failed_deletes(self) -> None:  # noqa: ARG001
    _run()
