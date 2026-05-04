import httpx
import pytest
import respx
from uuid import UUID

from onyx.error_handling.exceptions import OnyxError
from onyx.server.vaults.rag_client import RagAnythingClient


@pytest.fixture
def client() -> RagAnythingClient:
    return RagAnythingClient(base_url="http://rag.test", token="x" * 64)


@respx.mock
def test_create_kb_success(client: RagAnythingClient) -> None:
    respx.post("http://rag.test/v1/onyx/kb").mock(
        return_value=httpx.Response(
            201,
            json={
                "kb_id": "onyx-abc",
                "display_name": "Eng",
                "storage_quota_mb": 1024,
                "storage_used_mb": 0.0,
                "document_count": 0,
                "created_at": "2026-05-04T10:00:00Z",
                "onyx_workspace_id": None,
                "onyx_owner_user_id": "u-1",
            },
        )
    )
    out = client.create_kb(
        display_name="Eng",
        onyx_workspace_id=None,
        onyx_owner_user_id="u-1",
        storage_quota_mb=1024,
        user_id=UUID("11111111-2222-3333-4444-555555555555"),
    )
    assert out["kb_id"] == "onyx-abc"


@respx.mock
def test_get_kb_404_maps_to_onyx_error(client: RagAnythingClient) -> None:
    respx.get("http://rag.test/v1/onyx/kb/onyx-abc").mock(
        return_value=httpx.Response(404, json={"detail": "kb not found"})
    )
    with pytest.raises(OnyxError):
        client.get_kb(
            "onyx-abc",
            user_id=UUID("11111111-2222-3333-4444-555555555555"),
        )


@respx.mock
def test_delete_kb_204(client: RagAnythingClient) -> None:
    respx.delete("http://rag.test/v1/onyx/kb/onyx-abc").mock(
        return_value=httpx.Response(204)
    )
    client.delete_kb(
        "onyx-abc",
        user_id=UUID("11111111-2222-3333-4444-555555555555"),
    )
