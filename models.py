# models.py
from datetime import datetime
from sqlalchemy import (
    BigInteger, Boolean, Column, DateTime, Enum,
    Float, ForeignKey, Integer, String, Text
)
from sqlalchemy.orm import DeclarativeBase, relationship
import enum


class Base(DeclarativeBase):
    pass


# ─── Enums ────────────────────────────────────────────────────────────────────

class PetType(enum.Enum):
    CAT    = "cat"
    DOG    = "dog"
    BUNNY  = "bunny"
    BEAR   = "bear"

class PetMood(enum.Enum):
    HAPPY   = "happy"
    CONTENT = "content"
    SAD     = "sad"
    HUNGRY  = "hungry"
    SLEEPY  = "sleepy"

class ActionType(enum.Enum):
    FEED  = "feed"
    PLAY  = "play"
    PET   = "pet"

class InviteStatus(enum.Enum):
    PENDING  = "pending"
    ACCEPTED = "accepted"
    EXPIRED  = "expired"


# ─── User ─────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id            = Column(BigInteger, primary_key=True)   # telegram user_id
    username      = Column(String(64), nullable=True)
    first_name    = Column(String(128), nullable=True)
    is_premium    = Column(Boolean, default=False)
    created_at    = Column(DateTime, default=datetime.utcnow)
    last_seen_at  = Column(DateTime, default=datetime.utcnow)

    ownerships    = relationship("PetOwnership", back_populates="user")
    actions       = relationship("PetAction", back_populates="user")


# ─── Pet ──────────────────────────────────────────────────────────────────────

class Pet(Base):
    __tablename__ = "pets"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    name          = Column(String(32), nullable=False)
    pet_type      = Column(Enum(PetType), default=PetType.CAT)

    # Параметры состояния (0.0 – 100.0)
    hunger        = Column(Float, default=100.0)   # 100 = сытый, 0 = голодный
    happiness     = Column(Float, default=100.0)
    health        = Column(Float, default=100.0)

    # Прогресс
    level         = Column(Integer, default=1)
    experience    = Column(Integer, default=0)
    age_days      = Column(Integer, default=0)     # обновляется планировщиком

    # Streak — дней подряд, когда ОБА заходили
    streak        = Column(Integer, default=0)
    last_streak_date = Column(DateTime, nullable=True)

    # Текущее настроение (вычисляется при обновлении параметров)
    mood          = Column(Enum(PetMood), default=PetMood.HAPPY)

    created_at    = Column(DateTime, default=datetime.utcnow)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    ownerships    = relationship("PetOwnership", back_populates="pet")
    actions       = relationship("PetAction", back_populates="pet")
    invites       = relationship("Invite", back_populates="pet")


# ─── PetOwnership ─────────────────────────────────────────────────────────────

class PetOwnership(Base):
    """Связь питомец ↔ владелец. Максимум 2 записи на одного питомца."""
    __tablename__ = "pet_ownerships"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    pet_id        = Column(Integer, ForeignKey("pets.id"), nullable=False)
    user_id       = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    is_creator    = Column(Boolean, default=False)   # кто создал питомца
    joined_at     = Column(DateTime, default=datetime.utcnow)
    last_active_at = Column(DateTime, default=datetime.utcnow)

    pet           = relationship("Pet", back_populates="ownerships")
    user          = relationship("User", back_populates="ownerships")


# ─── PetAction ────────────────────────────────────────────────────────────────

class PetAction(Base):
    """Лог действий пользователей с питомцем."""
    __tablename__ = "pet_actions"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    pet_id        = Column(Integer, ForeignKey("pets.id"), nullable=False)
    user_id       = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    action_type   = Column(Enum(ActionType), nullable=False)
    performed_at  = Column(DateTime, default=datetime.utcnow)

    # Дельты которые применились к питомцу
    hunger_delta    = Column(Float, default=0.0)
    happiness_delta = Column(Float, default=0.0)
    health_delta    = Column(Float, default=0.0)

    pet           = relationship("Pet", back_populates="actions")
    user          = relationship("User", back_populates="actions")


# ─── Cooldown ─────────────────────────────────────────────────────────────────

class ActionCooldown(Base):
    """Кулдаун на действия: один пользователь — одно действие — один питомец."""
    __tablename__ = "action_cooldowns"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    user_id       = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    pet_id        = Column(Integer, ForeignKey("pets.id"), nullable=False)
    action_type   = Column(Enum(ActionType), nullable=False)
    available_at  = Column(DateTime, nullable=False)   # когда снова можно


# ─── Invite ───────────────────────────────────────────────────────────────────

class Invite(Base):
    __tablename__ = "invites"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    pet_id        = Column(Integer, ForeignKey("pets.id"), nullable=False)
    creator_id    = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    token         = Column(String(32), unique=True, nullable=False)  # uuid4 short
    status        = Column(Enum(InviteStatus), default=InviteStatus.PENDING)
    created_at    = Column(DateTime, default=datetime.utcnow)
    expires_at    = Column(DateTime, nullable=False)   # +72 часа от создания
    accepted_by   = Column(BigInteger, ForeignKey("users.id"), nullable=True)
    accepted_at   = Column(DateTime, nullable=True)

    pet           = relationship("Pet", back_populates="invites")