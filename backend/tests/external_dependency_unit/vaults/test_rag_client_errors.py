"""Error mapping — every HTTP status -> expected OnyxErrorCode."""
from uuid import UUID

import httpx
import pytest
import respx

from onyx.error_handling.error_codes import OnyxErrorCode
from onyx.error_handling.exceptions import OnyxError
from onyx.server.vaults.rag_client import RagAnythingClient


@pytest.fixture
def client() -> RagAnythingClient:
    return RagAnythingClient(base_url="http://rag.test", token="x" * 64)


@respx.mock
@pytest.mark.parametrize(
    "status,detail,expected_code",
    [
        (400, "bad", OnyxErrorCode.INVALID_INPUT),
        (404, "kb not found", OnyxErrorCode.NOT_FOUND),
        (413, "too big", OnyxErrorCode.INVALID_INPUT),
        (415, "unsupported", OnyxErrorCode.INVALID_INPUT),
        (429, "rate limited", OnyxErrorCode.RATE_LIMITED),
        (502, "upstream", OnyxErrorCode.BAD_GATEWAY),
        (503, "down", OnyxErrorCode.SERVICE_UNAVAILABLE),
    ],
)
def test_status_to_error_code(
    client: RagAnythingClient,
    status: int,
    detail: str,
    expected_code: OnyxErrorCode,
) -> None:
    respx.get("http://rag.test/v1/onyx/kb/onyx-x").mock(
        return_value=httpx.Response(status, json={"detail": detail})
    )
    with pytest.raises(OnyxError) as exc:
        client.get_kb("onyx-x", user_id=UUID(int=0))
    assert exc.value.error_code == expected_code


@respx.mock
def test_429_passes_retry_after(client: RagAnythingClient) -> None:
    respx.get("http://rag.test/v1/onyx/kb/onyx-x").mock(
        return_value=httpx.Response(
            429,
            json={"detail": "rate"},
            headers={"Retry-After": "30"},
        )
    )
    with pytest.raises(OnyxError) as exc:
        client.get_kb("onyx-x", user_id=UUID(int=0))
    assert "30" in str(exc.value.detail)
