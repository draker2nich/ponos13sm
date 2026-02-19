# models.py
from datetime import datetime, timezone
from sqlalchemy import (
    BigInteger, Boolean, Column, DateTime, Enum,
    Float, ForeignKey, Integer, String, Index, UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, relationship
import enum


class Base(DeclarativeBase):
    pass


def _utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ─── Enums ────────────────────────────────────────────────────────────────────

class PetType(enum.Enum):
    CAT   = "cat"
    DOG   = "dog"
    BUNNY = "bunny"
    BEAR  = "bear"

class PetMood(enum.Enum):
    HAPPY   = "happy"
    CONTENT = "content"
    SAD     = "sad"
    HUNGRY  = "hungry"
    SLEEPY  = "sleepy"

class ActionType(enum.Enum):
    FEED = "feed"
    PLAY = "play"
    PET  = "pet"

class InviteStatus(enum.Enum):
    PENDING  = "pending"
    ACCEPTED = "accepted"
    EXPIRED  = "expired"


# ─── User ─────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id           = Column(BigInteger, primary_key=True)
    username     = Column(String(64), nullable=True)
    first_name   = Column(String(128), nullable=True)
    is_premium   = Column(Boolean, default=False)
    created_at   = Column(DateTime, default=_utcnow)
    last_seen_at = Column(DateTime, default=_utcnow)

    ownerships = relationship("PetOwnership", back_populates="user")
    actions    = relationship("PetAction", back_populates="user")


# ─── Pet ──────────────────────────────────────────────────────────────────────

class Pet(Base):
    __tablename__ = "pets"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    name             = Column(String(32), nullable=False)
    pet_type         = Column(Enum(PetType), default=PetType.CAT)

    hunger           = Column(Float, default=100.0)
    happiness        = Column(Float, default=100.0)
    health           = Column(Float, default=100.0)

    level            = Column(Integer, default=1)
    experience       = Column(Integer, default=0)
    age_days         = Column(Integer, default=0)

    streak           = Column(Integer, default=0)
    last_streak_date = Column(DateTime, nullable=True)

    mood             = Column(Enum(PetMood), default=PetMood.HAPPY)

    created_at       = Column(DateTime, default=_utcnow)
    updated_at       = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    ownerships = relationship("PetOwnership", back_populates="pet")
    actions    = relationship("PetAction", back_populates="pet")
    invites    = relationship("Invite", back_populates="pet")


# ─── PetOwnership ─────────────────────────────────────────────────────────────

class PetOwnership(Base):
    __tablename__ = "pet_ownerships"
    __table_args__ = (
        UniqueConstraint("pet_id", "user_id", name="uq_ownership_pet_user"),
        Index("ix_ownership_user_id", "user_id"),
        Index("ix_ownership_pet_id", "pet_id"),
    )

    id             = Column(Integer, primary_key=True, autoincrement=True)
    pet_id         = Column(Integer, ForeignKey("pets.id"), nullable=False)
    user_id        = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    is_creator     = Column(Boolean, default=False)
    joined_at      = Column(DateTime, default=_utcnow)
    last_active_at = Column(DateTime, default=_utcnow)

    pet  = relationship("Pet", back_populates="ownerships")
    user = relationship("User", back_populates="ownerships")


# ─── PetAction ────────────────────────────────────────────────────────────────

class PetAction(Base):
    __tablename__ = "pet_actions"
    __table_args__ = (
        Index("ix_petaction_pet_id", "pet_id"),
    )

    id           = Column(Integer, primary_key=True, autoincrement=True)
    pet_id       = Column(Integer, ForeignKey("pets.id"), nullable=False)
    user_id      = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    # Сохраняем имя пользователя для отображения в ленте без JOIN
    user_name    = Column(String(128), nullable=True)
    action_type  = Column(Enum(ActionType), nullable=False)
    performed_at = Column(DateTime, default=_utcnow)

    hunger_delta    = Column(Float, default=0.0)
    happiness_delta = Column(Float, default=0.0)
    health_delta    = Column(Float, default=0.0)

    pet  = relationship("Pet", back_populates="actions")
    user = relationship("User", back_populates="actions")


# ─── Cooldown ─────────────────────────────────────────────────────────────────

class ActionCooldown(Base):
    __tablename__ = "action_cooldowns"
    __table_args__ = (
        UniqueConstraint("user_id", "pet_id", "action_type", name="uq_cooldown_user_pet_action"),
        Index("ix_cooldown_user_pet", "user_id", "pet_id"),
    )

    id           = Column(Integer, primary_key=True, autoincrement=True)
    user_id      = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    pet_id       = Column(Integer, ForeignKey("pets.id"), nullable=False)
    action_type  = Column(Enum(ActionType), nullable=False)
    available_at = Column(DateTime, nullable=False)


# ─── Invite ───────────────────────────────────────────────────────────────────

class Invite(Base):
    __tablename__ = "invites"
    __table_args__ = (
        Index("ix_invite_token", "token"),
    )

    id          = Column(Integer, primary_key=True, autoincrement=True)
    pet_id      = Column(Integer, ForeignKey("pets.id"), nullable=False)
    creator_id  = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    token       = Column(String(32), unique=True, nullable=False)
    status      = Column(Enum(InviteStatus), default=InviteStatus.PENDING)
    created_at  = Column(DateTime, default=_utcnow)
    expires_at  = Column(DateTime, nullable=False)
    accepted_by = Column(BigInteger, ForeignKey("users.id"), nullable=True)
    accepted_at = Column(DateTime, nullable=True)

    pet = relationship("Pet", back_populates="invites")