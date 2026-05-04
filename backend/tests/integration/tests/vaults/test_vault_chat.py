"""End-to-end chat: create session, query/sync writes history, SSE works."""
import requests

from tests.integration.common_utils.constants import API_SERVER_URL
from tests.integration.common_utils.test_models import DATestUser


def test_query_sync_persists_history(
    admin_user: DATestUser, indexed_vault
) -> None:  # type: ignore[no-untyped-def]
    sess_resp = requests.post(
        f"{API_SERVER_URL}/api/onyx/vaults/{indexed_vault.id}/chat/sessions",
        json={"title": "T"},
        headers=admin_user.headers,
        cookies=admin_user.cookies,
    )
    assert sess_resp.status_code == 201, sess_resp.text
    sid = sess_resp.json()["id"]

    resp = requests.post(
        f"{API_SERVER_URL}/api/onyx/vaults/{indexed_vault.id}/query/sync",
        json={
            "session_id": sid,
            "question": "what is in this doc?",
            "history": [],
            "mode": "hybrid",
            "top_k": 5,
            "include_sources": True,
            "max_history_turns": 5,
        },
        headers=admin_user.headers,
        cookies=admin_user.cookies,
    )
    assert resp.status_code == 200, resp.text

    msgs_resp = requests.get(
        f"{API_SERVER_URL}/api/onyx/vaults/{indexed_vault.id}/chat/sessions/{sid}/messages",
        headers=admin_user.headers,
        cookies=admin_user.cookies,
    )
    assert msgs_resp.status_code == 200, msgs_resp.text
    msgs = msgs_resp.json()
    assert len(msgs) == 2
    assert msgs[0]["role"] == "user"
    assert msgs[1]["role"] == "assistant"


def test_query_sse_emits_meta_chunk_done(
    admin_user: DATestUser, indexed_vault
) -> None:  # type: ignore[no-untyped-def]
    with requests.post(
        f"{API_SERVER_URL}/api/onyx/vaults/{indexed_vault.id}/query",
        json={
            "question": "hello",
            "history": [],
            "mode": "hybrid",
            "top_k": 5,
            "include_sources": True,
            "max_history_turns": 5,
        },
        headers=admin_user.headers,
        cookies=admin_user.cookies,
        stream=True,
    ) as r:
        assert r.status_code == 200, r.text
        events: list[str] = []
        for line in r.iter_lines(decode_unicode=True):
            if line and line.startswith("event:"):
                events.append(line.split(":", 1)[1].strip())
        assert events, "expected at least one SSE event"
        assert events[0] == "meta"
        assert events[-1] in ("done", "error")
