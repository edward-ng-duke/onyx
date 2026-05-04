from uuid import UUID

from onyx.server.vaults.rag_client import RagAnythingClient


def test_headers_include_required_fields() -> None:
    c = RagAnythingClient(base_url="http://rag.test", token="x" * 64)
    h = c._headers(
        user_id=UUID("11111111-2222-3333-4444-555555555555"),
        kb_id="onyx-abc123",
        request_id="rid-xyz",
    )
    assert h["Authorization"].startswith("Bearer ")
    assert h["X-Onyx-User-Id"] == "11111111-2222-3333-4444-555555555555"
    assert h["X-Onyx-KB-Id"] == "onyx-abc123"
    assert h["X-Request-Id"] == "rid-xyz"


def test_headers_omit_kb_id_when_none() -> None:
    c = RagAnythingClient(base_url="http://rag.test", token="x" * 64)
    h = c._headers(
        user_id=UUID("11111111-2222-3333-4444-555555555555"),
        kb_id=None,
    )
    assert "X-Onyx-KB-Id" not in h
    assert h["X-Request-Id"]  # auto-generated
