import httpx
import pytest
import respx
from uuid import UUID

from onyx.server.vaults.rag_client import RagAnythingClient


@pytest.fixture
def client() -> RagAnythingClient:
    return RagAnythingClient(base_url="http://rag.test", token="x" * 64)


@respx.mock
def test_upload_document(client: RagAnythingClient) -> None:
    respx.post("http://rag.test/v1/onyx/documents").mock(
        return_value=httpx.Response(
            202,
            json={
                "document_id": "d-1",
                "job_id": "j-1",
                "status": "queued",
                "deduplicated": False,
                "file_name": "x.pdf",
                "file_size": 12,
                "content_hash": "abc",
                "mime_type": "application/pdf",
            },
        )
    )
    out = client.upload_document(
        rag_tenant_id="onyx-abc",
        file_bytes=b"%PDF-1.4 hello",
        file_name="x.pdf",
        mime_type="application/pdf",
        user_id=UUID("11111111-2222-3333-4444-555555555555"),
    )
    assert out["document_id"] == "d-1"


@respx.mock
def test_list_documents_pass_through_cursor(client: RagAnythingClient) -> None:
    route = respx.get("http://rag.test/v1/onyx/documents").mock(
        return_value=httpx.Response(200, json={"items": [], "next_cursor": None})
    )
    client.list_documents(
        rag_tenant_id="onyx-abc",
        user_id=UUID("11111111-2222-3333-4444-555555555555"),
        cursor="abc",
        limit=10,
        status_filter="indexed",
    )
    assert route.calls.last.request.url.params["cursor"] == "abc"
    assert route.calls.last.request.url.params["limit"] == "10"
    assert route.calls.last.request.url.params["status"] == "indexed"


@respx.mock
def test_get_job(client: RagAnythingClient) -> None:
    respx.get("http://rag.test/v1/onyx/jobs/j-1").mock(
        return_value=httpx.Response(
            200,
            json={
                "job_id": "j-1",
                "document_id": "d-1",
                "job_type": "ingest",
                "status": "running",
                "progress": {},
                "error_message": None,
                "created_at": "2026-05-04T10:00:00Z",
                "started_at": "2026-05-04T10:00:01Z",
                "finished_at": None,
                "retries": 0,
            },
        )
    )
    out = client.get_job(
        "j-1",
        rag_tenant_id="onyx-abc",
        user_id=UUID("11111111-2222-3333-4444-555555555555"),
    )
    assert out["status"] == "running"
