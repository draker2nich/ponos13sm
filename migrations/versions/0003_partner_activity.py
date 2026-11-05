"""Partner notifications and a daily cap on mini-game coins

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-06
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("game_coins_day", sa.Date(), nullable=True))
    op.add_column("users", sa.Column("game_coins_today", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("pet_ownerships", sa.Column("last_notified_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("pet_ownerships", "last_notified_at")
    op.drop_column("users", "game_coins_today")
    op.drop_column("users", "game_coins_day")
