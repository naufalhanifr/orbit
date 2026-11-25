"""Founder is the root of the agent structure: drop the single top agent

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-25
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_index("uq_agents_one_top_per_org", table_name="agents", postgresql_where=sa.text("is_top"))
    op.drop_column("agents", "is_top")


def downgrade() -> None:
    op.add_column(
        "agents", sa.Column("is_top", sa.Boolean(), server_default="false", nullable=False)
    )
    op.create_index(
        "uq_agents_one_top_per_org",
        "agents",
        ["organization_id"],
        unique=True,
        postgresql_where=sa.text("is_top"),
    )
