"""Thin HTTP client wrapping RAG-Anything's /v1/onyx/* surface.

One class instance per ONYX backend process (cheap — wraps an
HttpxPool-managed sync Client). Auto-injects the 4 required headers,
maps non-2xx responses to OnyxError.
"""
from __future__ import annotations

import uuid
from collections.abc import Iterator
from typing import Any
from uuid import UUID

import httpx

from onyx.configs.app_configs import RAG_ANYTHING_BASE_URL
from onyx.configs.app_configs import RAG_ANYTHING_SSE_TIMEOUT_SEC
from onyx.configs.app_configs import RAG_ANYTHING_TIMEOUT_SEC
from onyx.configs.app_configs import RAG_ANYTHING_TOKEN
from onyx.error_handling.error_codes import OnyxErrorCode
from onyx.error_handling.exceptions import OnyxError
from onyx.httpx.httpx_pool import HttpxPool
from onyx.server.metrics.vault_metrics import vault_proxy_errors_total


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
        vault_proxy_errors_total.labels(path="rag_upstream", error_code=str(s)).inc()
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

    # ---- KB methods -------------------------------------------------------

    def create_kb(
        self,
        *,
        display_name: str,
        onyx_workspace_id: str | None,
        onyx_owner_user_id: str | None,
        storage_quota_mb: int,
        user_id: UUID,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        resp = self.client.post(
            f"{self._base}/v1/onyx/kb",
            json={
                "display_name": display_name,
                "onyx_workspace_id": onyx_workspace_id,
                "onyx_owner_user_id": onyx_owner_user_id,
                "storage_quota_mb": storage_quota_mb,
            },
            headers=self._headers(user_id=user_id, request_id=request_id),
            timeout=RAG_ANYTHING_TIMEOUT_SEC,
        )
        self._raise_for_status(resp)
        return resp.json()

    def get_kb(
        self,
        rag_tenant_id: str,
        *,
        user_id: UUID,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        resp = self.client.get(
            f"{self._base}/v1/onyx/kb/{rag_tenant_id}",
            headers=self._headers(
                user_id=user_id, kb_id=rag_tenant_id, request_id=request_id
            ),
            timeout=RAG_ANYTHING_TIMEOUT_SEC,
        )
        self._raise_for_status(resp)
        return resp.json()

    def list_kbs(
        self,
        *,
        user_id: UUID,
        cursor: str | None = None,
        limit: int = 50,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        params: dict[str, Any] = {"limit": limit}
        if cursor:
            params["cursor"] = cursor
        resp = self.client.get(
            f"{self._base}/v1/onyx/kb",
            params=params,
            headers=self._headers(user_id=user_id, request_id=request_id),
            timeout=RAG_ANYTHING_TIMEOUT_SEC,
        )
        self._raise_for_status(resp)
        return resp.json()

    def delete_kb(
        self,
        rag_tenant_id: str,
        *,
        user_id: UUID,
        request_id: str | None = None,
    ) -> None:
        resp = self.client.delete(
            f"{self._base}/v1/onyx/kb/{rag_tenant_id}",
            headers=self._headers(
                user_id=user_id, kb_id=rag_tenant_id, request_id=request_id
            ),
            timeout=RAG_ANYTHING_TIMEOUT_SEC,
        )
        self._raise_for_status(resp)

    # ---- Documents -------------------------------------------------------

    def upload_document(
        self,
        *,
        rag_tenant_id: str,
        file_bytes: bytes,
        file_name: str,
        mime_type: str,
        user_id: UUID,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        files = {"file": (file_name, file_bytes, mime_type)}
        resp = self.client.post(
            f"{self._base}/v1/onyx/documents",
            files=files,
            headers=self._headers(
                user_id=user_id, kb_id=rag_tenant_id, request_id=request_id
            ),
            timeout=60,
        )
        self._raise_for_status(resp)
        return resp.json()

    def list_documents(
        self,
        *,
        rag_tenant_id: str,
        user_id: UUID,
        cursor: str | None = None,
        limit: int = 50,
        status_filter: str | None = None,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        params: dict[str, Any] = {"limit": limit}
        if cursor:
            params["cursor"] = cursor
        if status_filter:
            params["status"] = status_filter
        resp = self.client.get(
            f"{self._base}/v1/onyx/documents",
            params=params,
            headers=self._headers(
                user_id=user_id, kb_id=rag_tenant_id, request_id=request_id
            ),
            timeout=10,
        )
        self._raise_for_status(resp)
        return resp.json()

    def get_document(
        self,
        document_id: str,
        *,
        rag_tenant_id: str,
        user_id: UUID,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        resp = self.client.get(
            f"{self._base}/v1/onyx/documents/{document_id}",
            headers=self._headers(
                user_id=user_id, kb_id=rag_tenant_id, request_id=request_id
            ),
            timeout=10,
        )
        self._raise_for_status(resp)
        return resp.json()

    def delete_document(
        self,
        document_id: str,
        *,
        rag_tenant_id: str,
        user_id: UUID,
        request_id: str | None = None,
    ) -> None:
        resp = self.client.delete(
            f"{self._base}/v1/onyx/documents/{document_id}",
            headers=self._headers(
                user_id=user_id, kb_id=rag_tenant_id, request_id=request_id
            ),
            timeout=10,
        )
        self._raise_for_status(resp)

    # ---- Jobs ------------------------------------------------------------

    def get_job(
        self,
        job_id: str,
        *,
        rag_tenant_id: str,
        user_id: UUID,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        resp = self.client.get(
            f"{self._base}/v1/onyx/jobs/{job_id}",
            headers=self._headers(
                user_id=user_id, kb_id=rag_tenant_id, request_id=request_id
            ),
            timeout=5,
        )
        self._raise_for_status(resp)
        return resp.json()

    # ---- Query -----------------------------------------------------------

    def query_sync(
        self,
        *,
        rag_tenant_id: str,
        body: dict[str, Any],
        user_id: UUID,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        resp = self.client.post(
            f"{self._base}/v1/onyx/query/sync",
            json=body,
            headers=self._headers(
                user_id=user_id, kb_id=rag_tenant_id, request_id=request_id
            ),
            timeout=120,
        )
        self._raise_for_status(resp)
        return resp.json()

    def stream_query(
        self,
        *,
        rag_tenant_id: str,
        body: dict[str, Any],
        user_id: UUID,
        request_id: str | None = None,
    ) -> Iterator[bytes]:
        """Yield raw bytes from the upstream SSE stream.

        Caller is responsible for forwarding bytes to client + parsing
        the `done` frame for chat-history persistence.
        """
        with self.client.stream(
            "POST",
            f"{self._base}/v1/onyx/query",
            json=body,
            headers=self._headers(
                user_id=user_id, kb_id=rag_tenant_id, request_id=request_id
            ),
            timeout=httpx.Timeout(
                connect=10, read=RAG_ANYTHING_SSE_TIMEOUT_SEC, write=10, pool=10
            ),
        ) as resp:
            if resp.status_code != 200:
                # Drain body to read JSON detail, then raise
                resp.read()
                self._raise_for_status(resp)
            for chunk in resp.iter_bytes():
                yield chunk

    # ---- KG --------------------------------------------------------------

    def kg_entities(
        self,
        *,
        rag_tenant_id: str,
        user_id: UUID,
        type_filter: str | None = None,
        search: str | None = None,
        cursor: str | None = None,
        limit: int = 50,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        params: dict[str, Any] = {"limit": limit}
        if type_filter:
            params["type"] = type_filter
        if search:
            params["search"] = search
        if cursor:
            params["cursor"] = cursor
        return self._kg_get(
            "/v1/onyx/kg/entities", params, rag_tenant_id, user_id, request_id
        )

    def kg_entity(
        self,
        entity_id: str,
        *,
        rag_tenant_id: str,
        user_id: UUID,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        return self._kg_get(
            f"/v1/onyx/kg/entities/{entity_id}",
            {},
            rag_tenant_id,
            user_id,
            request_id,
        )

    def kg_neighbors(
        self,
        entity_id: str,
        *,
        rag_tenant_id: str,
        user_id: UUID,
        depth: int = 1,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        return self._kg_get(
            f"/v1/onyx/kg/entities/{entity_id}/neighbors",
            {"depth": depth},
            rag_tenant_id,
            user_id,
            request_id,
        )

    def kg_relations(
        self,
        *,
        rag_tenant_id: str,
        user_id: UUID,
        source: str | None = None,
        target: str | None = None,
        type_filter: str | None = None,
        cursor: str | None = None,
        limit: int = 50,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        params: dict[str, Any] = {"limit": limit}
        if source:
            params["source"] = source
        if target:
            params["target"] = target
        if type_filter:
            params["type"] = type_filter
        if cursor:
            params["cursor"] = cursor
        return self._kg_get(
            "/v1/onyx/kg/relations", params, rag_tenant_id, user_id, request_id
        )

    def kg_chunk(
        self,
        chunk_id: str,
        *,
        rag_tenant_id: str,
        user_id: UUID,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        return self._kg_get(
            f"/v1/onyx/kg/chunks/{chunk_id}",
            {},
            rag_tenant_id,
            user_id,
            request_id,
        )

    def kg_stats(
        self,
        *,
        rag_tenant_id: str,
        user_id: UUID,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        return self._kg_get(
            "/v1/onyx/kg/stats", {}, rag_tenant_id, user_id, request_id
        )

    def kg_subgraph(
        self,
        *,
        rag_tenant_id: str,
        user_id: UUID,
        entities: str,
        depth: int = 2,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        return self._kg_get(
            "/v1/onyx/kg/subgraph",
            {"entities": entities, "depth": depth},
            rag_tenant_id,
            user_id,
            request_id,
        )

    def _kg_get(
        self,
        path: str,
        params: dict,
        rag_tenant_id: str,
        user_id: UUID,
        request_id: str | None,
    ) -> dict[str, Any]:
        resp = self.client.get(
            f"{self._base}{path}",
            params=params,
            headers=self._headers(
                user_id=user_id, kb_id=rag_tenant_id, request_id=request_id
            ),
            timeout=10,
        )
        self._raise_for_status(resp)
        return resp.json()
