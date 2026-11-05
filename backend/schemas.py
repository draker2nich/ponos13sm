from datetime import datetime, timezone
from typing import Annotated

from pydantic import BaseModel, PlainSerializer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.game import age_days, current_streak
from backend.models import ActionCooldown, ActionType, Pet, PetOwnership, User, utcnow

# DB timestamps are naive UTC; send them with an explicit offset so browsers don't read them as local time
UtcDatetime = Annotated[datetime, PlainSerializer(lambda d: d.replace(tzinfo=timezone.utc).isoformat())]


class OwnerOut(BaseModel):
    user_id: int
    name: str | None
    is_creator: bool
    is_me: bool
    last_active_at: UtcDatetime | None


class CooldownOut(BaseModel):
    action: str
    available_at: UtcDatetime | None


class PetOut(BaseModel):
    id: int
    name: str
    pet_type: str
    hunger: float
    happiness: float
    health: float
    level: int
    experience: int
    age_days: int
    streak: int
    mood: str
    is_sleeping: bool
    owners: list[OwnerOut]
    cooldowns: list[CooldownOut]
    updated_at: UtcDatetime


async def pet_out(db: AsyncSession, pet: Pet, me: User) -> PetOut:
    """Serialize a pet as seen by `me` (cooldowns are per user)."""
    now = utcnow()
    owners = (
        await db.execute(
            select(PetOwnership, User.first_name, User.username)
            .join(User, User.id == PetOwnership.user_id)
            .where(PetOwnership.pet_id == pet.id)
            .order_by(PetOwnership.joined_at)
        )
    ).all()
    cooldowns = {
        row.action_type: row.available_at
        for row in await db.scalars(
            select(ActionCooldown).where(ActionCooldown.user_id == me.id, ActionCooldown.pet_id == pet.id)
        )
    }

    return PetOut(
        id=pet.id,
        name=pet.name,
        pet_type=pet.pet_type.value,
        hunger=pet.hunger,
        happiness=pet.happiness,
        health=pet.health,
        level=pet.level,
        experience=pet.experience,
        age_days=age_days(pet, now),
        streak=current_streak(pet, now.date()),
        mood=pet.mood.value,
        is_sleeping=pet.is_sleeping,
        owners=[
            OwnerOut(
                user_id=own.user_id,
                name=first_name or username,
                is_creator=own.is_creator,
                is_me=own.user_id == me.id,
                last_active_at=own.last_active_at,
            )
            for own, first_name, username in owners
        ],
        cooldowns=[
            CooldownOut(
                action=action.value,
                available_at=cooldowns[action] if cooldowns.get(action) and cooldowns[action] > now else None,
            )
            for action in ActionType
            if action is not ActionType.WASH
        ],
        updated_at=pet.updated_at,
    )
