"""add vault tables

Revision ID: 7ebecd0b272e
Revises: 31bd8c17325e
Create Date: 2026-05-04 21:26:23.930425

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "7ebecd0b272e"
down_revision = "31bd8c17325e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "onyx_vault",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("rag_tenant_id", sa.Text(), nullable=False, unique=True),
        sa.Column("display_name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "visibility", sa.Text(), nullable=False, server_default="private"
        ),
        sa.Column(
            "owner_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id"),
            nullable=False,
        ),
        sa.Column(
            "storage_quota_mb", sa.Integer(), nullable=False, server_default="1024"
        ),
        sa.Column(
            "delete_retry_count", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "visibility IN ('private', 'workspace')", name="onyx_vault_visibility_chk"
        ),
    )
    op.create_index(
        "onyx_vault_owner_idx",
        "onyx_vault",
        ["owner_user_id"],
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.create_index(
        "onyx_vault_visibility_idx",
        "onyx_vault",
        ["visibility"],
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    op.create_table(
        "onyx_vault_member",
        sa.Column(
            "vault_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("onyx_vault.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("role", sa.Text(), nullable=False),
        sa.Column("granted_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint(
            "role IN ('owner', 'collaborator')", name="onyx_vault_member_role_chk"
        ),
    )
    op.create_index("onyx_vault_member_user_idx", "onyx_vault_member", ["user_id"])

    op.create_table(
        "onyx_vault_chat_session",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "vault_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("onyx_vault.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index(
        "onyx_vault_chat_session_owner_idx",
        "onyx_vault_chat_session",
        ["vault_id", "user_id", sa.text("updated_at DESC")],
    )

    op.create_table(
        "onyx_vault_chat_message",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "session_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("onyx_vault_chat_session.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("role", sa.Text(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("sources_json", postgresql.JSONB(), nullable=True),
        sa.Column("tokens_json", postgresql.JSONB(), nullable=True),
        sa.Column("request_id", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint(
            "role IN ('user', 'assistant')", name="onyx_vault_chat_message_role_chk"
        ),
    )
    op.create_index(
        "onyx_vault_chat_message_session_idx",
        "onyx_vault_chat_message",
        ["session_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "onyx_vault_chat_message_session_idx", table_name="onyx_vault_chat_message"
    )
    op.drop_table("onyx_vault_chat_message")
    op.drop_index(
        "onyx_vault_chat_session_owner_idx", table_name="onyx_vault_chat_session"
    )
    op.drop_table("onyx_vault_chat_session")
    op.drop_index("onyx_vault_member_user_idx", table_name="onyx_vault_member")
    op.drop_table("onyx_vault_member")
    op.drop_index("onyx_vault_visibility_idx", table_name="onyx_vault")
    op.drop_index("onyx_vault_owner_idx", table_name="onyx_vault")
    op.drop_table("onyx_vault")
