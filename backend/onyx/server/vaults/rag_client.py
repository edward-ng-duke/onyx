"""Thin HTTP client wrapping RAG-Anything's /v1/onyx/* surface.

One class instance per ONYX backend process (cheap — wraps an
HttpxPool-managed sync Client). Auto-injects the 4 required headers,
maps non-2xx responses to OnyxError.
"""
from __future__ import annotations

import uuid
from uuid import UUID

import httpx

from onyx.configs.app_configs import RAG_ANYTHING_BASE_URL
from onyx.configs.app_configs import RAG_ANYTHING_TOKEN
from onyx.error_handling.error_codes import OnyxErrorCode
from onyx.error_handling.exceptions import OnyxError
from onyx.httpx.httpx_pool import HttpxPool


class RagUpstreamError(Exception):
    """Internal — caught and converted to OnyxError. Lets callers
    distinguish upstream HTTP problems from local issues if needed."""


class RagAnythingClient:
    def __init__(
        self, base_url: str | None = None, token: str | None = None
    ) -> None:
        self._base = (base_url or RAG_ANYTHING_BASE_URL).rstrip("/")
        self._token = token or RAG_ANYTHING_TOKEN
        # _client lazily resolved on first use to avoid forcing pool init
        # in unit tests where only header / error-mapping logic is exercised.
        self._client: httpx.Client | None = None

    # ---- client accessor --------------------------------------------------

    @property
    def client(self) -> httpx.Client:
        if self._client is None:
            self._client = HttpxPool.get("rag_anything")
        return self._client

    # ---- header builder ---------------------------------------------------

    def _headers(
        self,
        *,
        user_id: UUID | str | None,
        kb_id: str | None = None,
        request_id: str | None = None,
        extra: dict[str, str] | None = None,
    ) -> dict[str, str]:
        h: dict[str, str] = {
            "Authorization": f"Bearer {self._token}",
            "X-Request-Id": request_id or uuid.uuid4().hex,
        }
        if user_id is not None:
            h["X-Onyx-User-Id"] = str(user_id)
        if kb_id is not None:
            h["X-Onyx-KB-Id"] = kb_id
        if extra:
            h.update(extra)
        return h

    # ---- error mapper -----------------------------------------------------

    def _raise_for_status(self, resp: httpx.Response) -> None:
        """Map non-2xx upstream responses to OnyxError instances.

        RAG-Anything returns FastAPI default `{detail: str}`. We map
        purely by HTTP status — no error_code field upstream.
        """
        if 200 <= resp.status_code < 300:
            return
        detail_text = ""
        try:
            data = resp.json()
            if isinstance(data, dict):
                detail_text = str(data.get("detail", ""))
        except Exception:  # noqa: BLE001
            detail_text = resp.text[:500]

        s = resp.status_code
        if s == 400:
            raise OnyxError(
                OnyxErrorCode.INVALID_INPUT, detail_text or "Invalid request"
            )
        if s == 401 or (s == 403 and "ip" in detail_text.lower()):
            # token / CIDR misconfig — never expose detail to user
            raise OnyxError(
                OnyxErrorCode.SERVICE_UNAVAILABLE,
                "Knowledge Vault service is unavailable",
            )
        if s == 404:
            raise OnyxError(OnyxErrorCode.NOT_FOUND, "Resource not found")
        if s == 413:
            raise OnyxError(OnyxErrorCode.INVALID_INPUT, "File too large")
        if s == 415:
            raise OnyxError(OnyxErrorCode.INVALID_INPUT, "Unsupported file type")
        if s == 429:
            ra = resp.headers.get("Retry-After", "60")
            raise OnyxError(
                OnyxErrorCode.RATE_LIMITED,
                f"Rate limited; retry after {ra}s",
            )
        if s == 503:
            raise OnyxError(
                OnyxErrorCode.SERVICE_UNAVAILABLE, "Service maintenance"
            )
        # 5xx fallback — bad gateway with override
        raise OnyxError(
            OnyxErrorCode.BAD_GATEWAY,
            f"Upstream returned {s}",
            status_code_override=s,
        )

    @property
    def base(self) -> str:
        return self._base
