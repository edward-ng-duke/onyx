"""Pydantic wire shapes for /api/onyx/vaults/*.

ONYX-side DTOs. Distinct from RAG-Anything's onyx_schemas.py — RAG
schemas are the upstream wire; these are what the ONYX UI consumes.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, Field, StringConstraints


class VaultRole(str, Enum):
    READER = "reader"           # implicit (workspace visibility, same tenant)
    COLLABORATOR = "collaborator"
    OWNER = "owner"


class VaultVisibility(str, Enum):
    PRIVATE = "private"
    WORKSPACE = "workspace"


class CreateVaultRequest(BaseModel):
    display_name: Annotated[str, StringConstraints(min_length=1, max_length=200)]
    description: Annotated[str, StringConstraints(max_length=1000)] | None = None
    visibility: VaultVisibility = VaultVisibility.PRIVATE
    storage_quota_mb: int = Field(default=1024, ge=64, le=102400)


class UpdateVaultRequest(BaseModel):
    display_name: Annotated[str, StringConstraints(min_length=1, max_length=200)] | None = None
    description: Annotated[str, StringConstraints(max_length=1000)] | None = None
    visibility: VaultVisibility | None = None


class VaultBrief(BaseModel):
    id: UUID
    display_name: str
    description: str | None
    visibility: VaultVisibility
    owner_user_id: UUID
    document_count: int
    storage_used_mb: float
    storage_quota_mb: int
    effective_role: VaultRole
    created_at: datetime
    updated_at: datetime


class VaultDetail(VaultBrief):
    rag_tenant_id: str


class VaultListResponse(BaseModel):
    owned: list[VaultBrief]
    collaborator: list[VaultBrief]
    workspace: list[VaultBrief]


class AddMemberRequest(BaseModel):
    user_id: UUID
    role: VaultRole = VaultRole.COLLABORATOR  # owner upgrades only via PATCH


class MemberResponse(BaseModel):
    user_id: UUID
    role: VaultRole
    granted_at: datetime


class VaultChatSendRequest(BaseModel):
    """Body for POST /api/onyx/vaults/{id}/query and /query/sync.

    `session_id` is optional; when present, ONYX backend writes the
    user message + assistant reply into onyx_vault_chat_message.
    """
    session_id: UUID | None = None
    question: Annotated[str, StringConstraints(min_length=1, max_length=4000)]
    history: list["VaultChatHistoryMessage"] = Field(default_factory=list, max_length=50)
    mode: str = "hybrid"
    top_k: int = Field(default=10, ge=1, le=50)
    vlm_enhanced: bool = False
    include_sources: bool = True
    max_history_turns: int = Field(default=5, ge=0, le=20)


class VaultChatHistoryMessage(BaseModel):
    role: str  # 'user' | 'assistant'
    content: str


class VaultChatSessionBrief(BaseModel):
    id: UUID
    title: str | None
    created_at: datetime
    updated_at: datetime


class VaultChatMessageResponse(BaseModel):
    id: UUID
    session_id: UUID
    role: str
    content: str
    sources_json: list[dict] | None
    tokens_json: dict | None
    request_id: str | None
    created_at: datetime
