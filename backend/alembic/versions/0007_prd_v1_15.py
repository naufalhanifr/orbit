"""PRD v1.15: derived agent status, archive flag, Works in all projects,
no token limits, no Revision task status

Revision ID: 0007
Revises: 0006
Create Date: 2026-11-25
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: str | None = "0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TASK_STATUS_COLUMNS = [
    ("tasks", "status"),
    ("tasks", "status_before_block"),
    ("task_status_events", "from_status"),
    ("task_status_events", "to_status"),
]


def _retype_task_status(values: list[str], mapping: dict[str, str]) -> None:
    op.execute("ALTER TYPE task_status RENAME TO task_status_old")
    op.execute(f"CREATE TYPE task_status AS ENUM ({', '.join(repr(v) for v in values)})")
    for table, column in TASK_STATUS_COLUMNS:
        expr = f"{column}::text"
        if mapping:
            whens = "".join(f" WHEN '{old}' THEN '{new}'" for old, new in mapping.items())
            expr = f"CASE {expr}{whens} ELSE {expr} END"
        op.execute(f"ALTER TABLE {table} ALTER COLUMN {column} DROP DEFAULT")
        op.execute(
            f"ALTER TABLE {table} ALTER COLUMN {column} TYPE task_status USING ({expr})::task_status"
        )
    op.execute("DROP TYPE task_status_old")


def upgrade() -> None:
    op.add_column("agents", sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "agents",
        sa.Column("works_in_all_projects", sa.Boolean(), server_default="false", nullable=False),
    )
    op.execute("UPDATE agents SET archived_at = now() WHERE status = 'archived'")
    op.drop_column("agents", "status")
    op.execute("DROP TYPE agent_status")
    op.drop_column("agents", "token_limit_per_execution")
    op.drop_column("executions", "token_limit")
    _retype_task_status(
        ["backlog", "assigned", "in_progress", "founder_approval", "blocked", "done", "cancelled"],
        {"revision": "in_progress"},
    )


def downgrade() -> None:
    _retype_task_status(
        ["backlog", "assigned", "in_progress", "founder_approval", "revision", "blocked", "done", "cancelled"],
        {},
    )
    op.add_column(
        "executions",
        sa.Column("token_limit", sa.Integer(), server_default="300000", nullable=False),
    )
    op.add_column(
        "agents",
        sa.Column("token_limit_per_execution", sa.Integer(), server_default="300000", nullable=False),
    )
    agent_status = sa.Enum(
        "draft", "configuring", "ready", "active", "paused", "error", "archived", name="agent_status"
    )
    agent_status.create(op.get_bind())
    op.add_column(
        "agents", sa.Column("status", agent_status, server_default="draft", nullable=False)
    )
    op.execute("UPDATE agents SET status = 'archived' WHERE archived_at IS NOT NULL")
    op.drop_column("agents", "works_in_all_projects")
    op.drop_column("agents", "archived_at")
