"""CRUD for onyx_vault_chat_session + onyx_vault_chat_message."""
from __future__ import annotations

from typing import Sequence
from uuid import UUID

from sqlalchemy import delete
from sqlalchemy import func
from sqlalchemy import select
from sqlalchemy import update
from sqlalchemy.orm import Session

from onyx.db.models import VaultChatMessage
from onyx.db.models import VaultChatSession


def create_session(
    db: Session, *, vault_id: UUID, user_id: UUID, title: str | None,
) -> VaultChatSession:
    s = VaultChatSession(vault_id=vault_id, user_id=user_id, title=title)
    db.add(s)
    db.flush()
    return s


def list_sessions(
    db: Session, *, vault_id: UUID, user_id: UUID,
) -> Sequence[VaultChatSession]:
    return db.execute(
        select(VaultChatSession).where(
            VaultChatSession.vault_id == vault_id,
            VaultChatSession.user_id == user_id,
        ).order_by(VaultChatSession.updated_at.desc())
    ).scalars().all()


def get_session(
    db: Session, *, session_id: UUID, user_id: UUID,
) -> VaultChatSession | None:
    return db.execute(
        select(VaultChatSession).where(
            VaultChatSession.id == session_id,
            VaultChatSession.user_id == user_id,
        )
    ).scalar_one_or_none()


def delete_session(db: Session, session_id: UUID) -> None:
    db.execute(delete(VaultChatSession).where(VaultChatSession.id == session_id))


def add_user_message(
    db: Session, *, session_id: UUID, content: str,
) -> VaultChatMessage:
    m = VaultChatMessage(session_id=session_id, role="user", content=content)
    db.add(m)
    db.execute(
        update(VaultChatSession)
        .where(VaultChatSession.id == session_id)
        .values(updated_at=func.now())
    )
    db.flush()
    return m


def add_assistant_message(
    db: Session,
    *,
    session_id: UUID,
    content: str,
    sources: list[dict] | None = None,
    tokens: dict | None = None,
    request_id: str | None = None,
) -> VaultChatMessage:
    m = VaultChatMessage(
        session_id=session_id,
        role="assistant",
        content=content,
        sources_json=sources,
        tokens_json=tokens,
        request_id=request_id,
    )
    db.add(m)
    db.execute(
        update(VaultChatSession)
        .where(VaultChatSession.id == session_id)
        .values(updated_at=func.now())
    )
    db.flush()
    return m


def list_messages(
    db: Session, *, session_id: UUID,
) -> Sequence[VaultChatMessage]:
    return db.execute(
        select(VaultChatMessage)
        .where(VaultChatMessage.session_id == session_id)
        .order_by(VaultChatMessage.created_at)
    ).scalars().all()
