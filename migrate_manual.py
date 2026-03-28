"""add last_coin_claim and WASH action type

Revision ID: manual_001
Revises: <вставь текущую revision>
Create Date: 2025-03-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'manual_001'
down_revision: Union[str, None] = None  # <-- заменить на текущую ревизию
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Добавить колонку last_coin_claim в users
    op.add_column('users', sa.Column('last_coin_claim', sa.DateTime(), nullable=True))

    # 2. Добавить значение WASH в enum actiontype
    # PostgreSQL: ALTER TYPE ... ADD VALUE
    op.execute("ALTER TYPE actiontype ADD VALUE IF NOT EXISTS 'WASH'")


def downgrade() -> None:
    op.drop_column('users', 'last_coin_claim')
    # Удалить значение из enum в PostgreSQL нетривиально,
    # проще оставить — оно не мешает