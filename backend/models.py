import enum
from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import DeclarativeBase, relationship


def utcnow() -> datetime:
    """Naive UTC timestamp — every DateTime column in the schema is naive UTC."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Base(DeclarativeBase):
    pass


class PetType(enum.Enum):
    CAT = "cat"
    DOG = "dog"
    BUNNY = "bunny"
    BEAR = "bear"


class PetMood(enum.Enum):
    HAPPY = "happy"
    CONTENT = "content"
    SAD = "sad"
    HUNGRY = "hungry"
    SLEEPY = "sleepy"


class ActionType(enum.Enum):
    FEED = "feed"
    PLAY = "play"
    PET = "pet"
    WASH = "wash"


class InviteStatus(enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"


class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True)  # Telegram user id
    username = Column(String(64))
    first_name = Column(String(128))
    is_premium = Column(Boolean, default=False)
    coins = Column(Integer, default=0)
    game_best_score = Column(Integer, default=0)
    last_coin_claim = Column(DateTime)
    # Coins earned in mini games today (UTC), capped per day
    game_coins_day = Column(Date)
    game_coins_today = Column(Integer, nullable=False, default=0, server_default="0")
    created_at = Column(DateTime, default=utcnow)
    last_seen_at = Column(DateTime, default=utcnow)

    ownerships = relationship("PetOwnership", back_populates="user")

    @property
    def display_name(self) -> str | None:
        return self.first_name or self.username


class Pet(Base):
    __tablename__ = "pets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(32), nullable=False)
    pet_type = Column(Enum(PetType), default=PetType.CAT)

    hunger = Column(Float, default=100.0)
    happiness = Column(Float, default=100.0)
    health = Column(Float, default=100.0)

    level = Column(Integer, default=1)
    experience = Column(Integer, default=0)

    streak = Column(Integer, default=0)
    last_streak_date = Column(DateTime)
    # Each one covers a missed day, so the streak survives it
    streak_freezes = Column(Integer, nullable=False, default=0, server_default="0")

    mood = Column(Enum(PetMood), default=PetMood.HAPPY)
    is_sleeping = Column(Boolean, default=False)

    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    # Stats are decayed lazily on read: this is the moment they were last brought up to date
    decayed_at = Column(DateTime, nullable=False, default=utcnow, server_default=func.now())

    ownerships = relationship("PetOwnership", back_populates="pet")


class PetOwnership(Base):
    __tablename__ = "pet_ownerships"
    __table_args__ = (
        UniqueConstraint("pet_id", "user_id", name="uq_ownership_pet_user"),
        Index("ix_ownership_user_id", "user_id"),
        Index("ix_ownership_pet_id", "pet_id"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    pet_id = Column(Integer, ForeignKey("pets.id"), nullable=False)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    is_creator = Column(Boolean, default=False)
    joined_at = Column(DateTime, default=utcnow)
    last_active_at = Column(DateTime, default=utcnow)
    # Last time this owner got a Telegram message about the partner's activity
    last_notified_at = Column(DateTime)

    pet = relationship("Pet", back_populates="ownerships")
    user = relationship("User", back_populates="ownerships")


class PetAction(Base):
    __tablename__ = "pet_actions"
    __table_args__ = (Index("ix_petaction_pet_id", "pet_id"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    pet_id = Column(Integer, ForeignKey("pets.id"), nullable=False)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    user_name = Column(String(128))
    action_type = Column(Enum(ActionType), nullable=False)
    performed_at = Column(DateTime, default=utcnow)

    hunger_delta = Column(Float, default=0.0)
    happiness_delta = Column(Float, default=0.0)
    health_delta = Column(Float, default=0.0)


class ActionCooldown(Base):
    __tablename__ = "action_cooldowns"
    __table_args__ = (
        UniqueConstraint("user_id", "pet_id", "action_type", name="uq_cooldown_user_pet_action"),
        Index("ix_cooldown_user_pet", "user_id", "pet_id"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    pet_id = Column(Integer, ForeignKey("pets.id"), nullable=False)
    action_type = Column(Enum(ActionType), nullable=False)
    available_at = Column(DateTime, nullable=False)


class Invite(Base):
    __tablename__ = "invites"
    __table_args__ = (Index("ix_invite_token", "token"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    pet_id = Column(Integer, ForeignKey("pets.id"), nullable=False)
    creator_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    token = Column(String(32), unique=True, nullable=False)
    status = Column(Enum(InviteStatus), default=InviteStatus.PENDING)
    created_at = Column(DateTime, default=utcnow)
    expires_at = Column(DateTime, nullable=False)
    accepted_by = Column(BigInteger, ForeignKey("users.id"))
    accepted_at = Column(DateTime)
