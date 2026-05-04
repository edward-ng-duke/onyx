"""Prometheus metrics for /api/onyx/vaults proxy + reconcile worker.

Cardinality kept low: `path` is the route template (e.g.
"/vaults/{vault_id}/documents"), not the resolved URL.
"""
from prometheus_client import Counter, Gauge, Histogram

vault_proxy_requests_total = Counter(
    "onyx_vault_proxy_requests_total",
    "Count of /api/onyx/vaults proxy requests",
    ["path", "status"],
)

vault_proxy_latency_seconds = Histogram(
    "onyx_vault_proxy_latency_seconds",
    "Latency of /api/onyx/vaults proxy requests",
    ["path"],
    buckets=[0.05, 0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
)

vault_proxy_errors_total = Counter(
    "onyx_vault_proxy_errors_total",
    "Count of OnyxError responses from /api/onyx/vaults proxy",
    ["path", "error_code"],
)

vault_proxy_sse_dropped_total = Counter(
    "onyx_vault_proxy_sse_dropped_total",
    "Count of SSE streams dropped (client disconnect or 30s no-heartbeat)",
)

vault_reconcile_pending = Gauge(
    "onyx_vault_reconcile_pending",
    "Number of soft-deleted vaults awaiting RAG-side cascade",
)
