"""Streak freezes: a missed day doesn't reset the shared streak

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-06
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("pets", sa.Column("streak_freezes", sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_column("pets", "streak_freezes")
