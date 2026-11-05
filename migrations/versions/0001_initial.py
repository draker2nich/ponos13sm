"""Initial schema (matches the database created by the original create_all + manual WASH/last_coin_claim migration)

Revision ID: 0001
Revises:
Create Date: 2026-11-06
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table('pets',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('name', sa.String(length=32), nullable=False),
    sa.Column('pet_type', sa.Enum('CAT', 'DOG', 'BUNNY', 'BEAR', name='pettype'), nullable=True),
    sa.Column('hunger', sa.Float(), nullable=True),
    sa.Column('happiness', sa.Float(), nullable=True),
    sa.Column('health', sa.Float(), nullable=True),
    sa.Column('level', sa.Integer(), nullable=True),
    sa.Column('experience', sa.Integer(), nullable=True),
    sa.Column('age_days', sa.Integer(), nullable=True),
    sa.Column('streak', sa.Integer(), nullable=True),
    sa.Column('last_streak_date', sa.DateTime(), nullable=True),
    sa.Column('mood', sa.Enum('HAPPY', 'CONTENT', 'SAD', 'HUNGRY', 'SLEEPY', name='petmood'), nullable=True),
    sa.Column('is_sleeping', sa.Boolean(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('users',
    sa.Column('id', sa.BigInteger(), nullable=False),
    sa.Column('username', sa.String(length=64), nullable=True),
    sa.Column('first_name', sa.String(length=128), nullable=True),
    sa.Column('is_premium', sa.Boolean(), nullable=True),
    sa.Column('coins', sa.Integer(), nullable=True),
    sa.Column('game_best_score', sa.Integer(), nullable=True),
    sa.Column('last_coin_claim', sa.DateTime(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('last_seen_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('action_cooldowns',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('user_id', sa.BigInteger(), nullable=False),
    sa.Column('pet_id', sa.Integer(), nullable=False),
    sa.Column('action_type', sa.Enum('FEED', 'PLAY', 'PET', 'WASH', name='actiontype'), nullable=False),
    sa.Column('available_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['pet_id'], ['pets.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'pet_id', 'action_type', name='uq_cooldown_user_pet_action')
    )
    op.create_index('ix_cooldown_user_pet', 'action_cooldowns', ['user_id', 'pet_id'], unique=False)
    op.create_table('invites',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('pet_id', sa.Integer(), nullable=False),
    sa.Column('creator_id', sa.BigInteger(), nullable=False),
    sa.Column('token', sa.String(length=32), nullable=False),
    sa.Column('status', sa.Enum('PENDING', 'ACCEPTED', 'EXPIRED', name='invitestatus'), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('expires_at', sa.DateTime(), nullable=False),
    sa.Column('accepted_by', sa.BigInteger(), nullable=True),
    sa.Column('accepted_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['accepted_by'], ['users.id'], ),
    sa.ForeignKeyConstraint(['creator_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['pet_id'], ['pets.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('token')
    )
    op.create_index('ix_invite_token', 'invites', ['token'], unique=False)
    op.create_table('pet_actions',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('pet_id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.BigInteger(), nullable=False),
    sa.Column('user_name', sa.String(length=128), nullable=True),
    sa.Column('action_type', sa.Enum('FEED', 'PLAY', 'PET', 'WASH', name='actiontype'), nullable=False),
    sa.Column('performed_at', sa.DateTime(), nullable=True),
    sa.Column('hunger_delta', sa.Float(), nullable=True),
    sa.Column('happiness_delta', sa.Float(), nullable=True),
    sa.Column('health_delta', sa.Float(), nullable=True),
    sa.ForeignKeyConstraint(['pet_id'], ['pets.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_petaction_pet_id', 'pet_actions', ['pet_id'], unique=False)
    op.create_table('pet_ownerships',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('pet_id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.BigInteger(), nullable=False),
    sa.Column('is_creator', sa.Boolean(), nullable=True),
    sa.Column('joined_at', sa.DateTime(), nullable=True),
    sa.Column('last_active_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['pet_id'], ['pets.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('pet_id', 'user_id', name='uq_ownership_pet_user')
    )
    op.create_index('ix_ownership_pet_id', 'pet_ownerships', ['pet_id'], unique=False)
    op.create_index('ix_ownership_user_id', 'pet_ownerships', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_ownership_user_id', table_name='pet_ownerships')
    op.drop_index('ix_ownership_pet_id', table_name='pet_ownerships')
    op.drop_table('pet_ownerships')
    op.drop_index('ix_petaction_pet_id', table_name='pet_actions')
    op.drop_table('pet_actions')
    op.drop_index('ix_invite_token', table_name='invites')
    op.drop_table('invites')
    op.drop_index('ix_cooldown_user_pet', table_name='action_cooldowns')
    op.drop_table('action_cooldowns')
    op.drop_table('users')
    op.drop_table('pets')
    for enum in ("pettype", "petmood", "actiontype", "invitestatus"):
        op.execute(f"DROP TYPE IF EXISTS {enum}")
