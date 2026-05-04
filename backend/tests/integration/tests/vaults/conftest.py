"""Shared fixtures for vault integration tests."""
from collections.abc import Generator
from typing import Any

import pytest
import requests

from tests.integration.common_utils.constants import API_SERVER_URL
from tests.integration.common_utils.test_models import DATestUser


class _IndexedVault:
    """Lightweight handle for a created vault used by chat tests.

    v1 plumbing test: vault is created (RAG-side KB created), but no
    document is uploaded. Chat queries against an empty KB exercise
    the proxy/SSE plumbing; the KG side may emit an `error` rather
    than `done` frame, which the test tolerates.
    """

    def __init__(self, data: dict[str, Any]) -> None:
        self._data = data

    @property
    def id(self) -> str:
        return self._data["id"]


@pytest.fixture
def indexed_vault(admin_user: DATestUser) -> Generator[_IndexedVault, None, None]:
    resp = requests.post(
        f"{API_SERVER_URL}/api/onyx/vaults",
        json={
            "display_name": "ChatTest",
            "visibility": "private",
            "storage_quota_mb": 1024,
        },
        headers=admin_user.headers,
        cookies=admin_user.cookies,
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    vault = _IndexedVault(data)
    try:
        yield vault
    finally:
        # Best-effort cleanup
        try:
            requests.delete(
                f"{API_SERVER_URL}/api/onyx/vaults/{vault.id}",
                headers=admin_user.headers,
                cookies=admin_user.cookies,
                timeout=10,
            )
        except Exception:
            pass
