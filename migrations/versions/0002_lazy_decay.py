"""Lazy stat decay: track pets.decayed_at, derive age from created_at

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-06
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "pets",
        sa.Column("decayed_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    # Existing pets were decayed hourly by the old scheduler, so "now" is the right starting point
    op.execute("UPDATE pets SET decayed_at = (now() AT TIME ZONE 'utc')")
    op.drop_column("pets", "age_days")


def downgrade() -> None:
    op.add_column("pets", sa.Column("age_days", sa.Integer(), nullable=True))
    op.execute("UPDATE pets SET age_days = GREATEST(0, DATE_PART('day', (now() AT TIME ZONE 'utc') - created_at))::int")
    op.drop_column("pets", "decayed_at")
