"""CRUD tests for vault chat session + message persistence."""
from uuid import uuid4

from sqlalchemy.orm import Session

from onyx.db.vault import insert_vault
from onyx.server.vaults.chat_history import add_assistant_message
from onyx.server.vaults.chat_history import add_user_message
from onyx.server.vaults.chat_history import create_session
from onyx.server.vaults.chat_history import list_messages
from onyx.server.vaults.chat_history import list_sessions
from onyx.server.vaults.schemas import VaultVisibility
from tests.external_dependency_unit.conftest import create_test_user


def _make_vault(db_session: Session, owner_id):  # type: ignore[no-untyped-def]
    return insert_vault(
        db_session,
        rag_tenant_id=f"onyx-{uuid4()}",
        display_name="V",
        description=None,
        visibility=VaultVisibility.PRIVATE,
        owner_user_id=owner_id,
        storage_quota_mb=1024,
    )


def test_session_then_message_round_trip(db_session: Session) -> None:
    user = create_test_user(db_session, email_prefix="vault_chat_rt")
    vault = _make_vault(db_session, user.id)
    db_session.commit()

    s = create_session(
        db_session, vault_id=vault.id, user_id=user.id, title=None
    )
    add_user_message(db_session, session_id=s.id, content="hello")
    add_assistant_message(
        db_session,
        session_id=s.id,
        content="hi there",
        sources=[{"document_id": "d1"}],
        tokens={"total": 42},
        request_id="r1",
    )
    db_session.commit()

    msgs = list_messages(db_session, session_id=s.id)
    assert len(msgs) == 2
    assert msgs[0].role == "user"
    assert msgs[1].role == "assistant"
    assert msgs[1].sources_json == [{"document_id": "d1"}]
    assert msgs[1].tokens_json == {"total": 42}
    assert msgs[1].request_id == "r1"


def test_list_sessions_per_user(db_session: Session) -> None:
    user = create_test_user(db_session, email_prefix="vault_chat_list")
    vault = _make_vault(db_session, user.id)
    db_session.commit()

    create_session(db_session, vault_id=vault.id, user_id=user.id, title="A")
    create_session(db_session, vault_id=vault.id, user_id=user.id, title="B")
    db_session.commit()

    sessions = list_sessions(db_session, vault_id=vault.id, user_id=user.id)
    assert {x.title for x in sessions} == {"A", "B"}
