"""Execution lifecycle per PRD 18.3: add preparing, waiting_for_input, suspended;
rename stopped to cancelled

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-25
"""
from collections.abc import Sequence

from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TYPE execution_status RENAME VALUE 'stopped' TO 'cancelled'")
    op.execute("ALTER TYPE execution_status ADD VALUE 'preparing' AFTER 'queued'")
    op.execute("ALTER TYPE execution_status ADD VALUE 'waiting_for_input' AFTER 'running'")
    op.execute("ALTER TYPE execution_status ADD VALUE 'suspended' AFTER 'waiting_for_input'")


def downgrade() -> None:
    # Postgres cannot drop enum values: rebuild the old type and map new states.
    op.execute("ALTER TYPE execution_status RENAME TO execution_status_new")
    op.execute(
        "CREATE TYPE execution_status AS ENUM ('queued', 'running', 'completed', 'failed', 'stopped')"
    )
    op.execute("ALTER TABLE executions ALTER COLUMN status DROP DEFAULT")
    op.execute(
        """
        ALTER TABLE executions ALTER COLUMN status TYPE execution_status USING (
            CASE status::text
                WHEN 'cancelled' THEN 'stopped'
                WHEN 'preparing' THEN 'running'
                WHEN 'waiting_for_input' THEN 'running'
                WHEN 'suspended' THEN 'queued'
                ELSE status::text
            END
        )::execution_status
        """
    )
    op.execute("DROP TYPE execution_status_new")
