# core/pet_logic.py
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select, update as sa_update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from models import (
    ActionCooldown, ActionType, Pet, PetAction,
    PetMood, PetOwnership, User
)
from core.config import settings


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ─── Mood ─────────────────────────────────────────────────────────────────────

def calc_mood(pet: Pet) -> PetMood:
    hour = utcnow().hour
    if pet.is_sleeping:
        return PetMood.SLEEPY
    if 0 <= hour < 7:
        return PetMood.SLEEPY
    if pet.hunger < 20:
        return PetMood.HUNGRY
    if pet.energy < 20:
        return PetMood.SLEEPY
    if pet.happiness < 30 or pet.health < 30:
        return PetMood.SAD
    if pet.hunger >= 70 and pet.happiness >= 70 and pet.energy >= 50:
        return PetMood.HAPPY
    return PetMood.CONTENT


# ─── Decay ────────────────────────────────────────────────────────────────────

def apply_decay(pet: Pet, hours_passed: float) -> None:
    if pet.is_sleeping:
        # Sleeping: slow decay, energy REGENERATES
        multiplier = 0.25
        pet.energy = min(100.0, pet.energy + settings.energy_regen_sleep_per_hour * hours_passed)
    else:
        multiplier = 1.0
        pet.energy = max(0.0, pet.energy - settings.energy_decay_per_hour * hours_passed * multiplier)

    pet.hunger    = max(0.0, pet.hunger    - settings.hunger_decay_per_hour    * hours_passed * multiplier)
    pet.happiness = max(0.0, pet.happiness - settings.happiness_decay_per_hour * hours_passed * multiplier)
    pet.health    = max(0.0, pet.health    - settings.health_decay_per_hour    * hours_passed * multiplier)
    pet.mood      = calc_mood(pet)
    pet.updated_at = utcnow()


# ─── Coin modifier based on pet stats ────────────────────────────────────────

def coin_multiplier(pet: Pet) -> float:
    """Returns a multiplier 0.0–1.0 that reduces coin earnings when stats are low."""
    mult = 1.0
    if pet.hunger < 20:
        mult *= 0.5
    if pet.happiness < 20:
        mult *= 0.75
    return mult


def xp_multiplier(pet: Pet) -> float:
    """Returns XP multiplier — reduced when happiness is low."""
    if pet.happiness < 20:
        return 0.5
    return 1.0


# ─── Game energy check ───────────────────────────────────────────────────────

def can_play_game(pet: Pet) -> bool:
    """Check if pet has enough energy to start a game."""
    return pet.energy >= settings.game_min_energy and not pet.is_sleeping


def spend_game_energy(pet: Pet) -> None:
    """Deduct energy for playing a game session."""
    pet.energy = max(0.0, pet.energy - settings.game_energy_cost)
    # Playing boosts happiness slightly
    pet.happiness = min(100.0, pet.happiness + 3.0)
    # But drains hunger a bit
    pet.hunger = max(0.0, pet.hunger - 2.0)
    pet.mood = calc_mood(pet)
    pet.updated_at = utcnow()


# ─── Actions ──────────────────────────────────────────────────────────────────

ACTION_CONFIG = {
    ActionType.FEED: {
        "cooldown_hours": settings.feed_cooldown_hours,
        "deltas": {"hunger": settings.feed_hunger_restore, "happiness": 5.0, "health": 0.0},
    },
    ActionType.PLAY: {
        "cooldown_hours": settings.play_cooldown_hours,
        "deltas": {"hunger": -5.0, "happiness": settings.play_happiness_restore, "health": 5.0},
    },
    ActionType.PET: {
        "cooldown_hours": settings.pet_cooldown_hours,
        "deltas": {"hunger": 0.0, "happiness": settings.pet_happiness_restore, "health": settings.pet_health_restore},
    },
}


async def get_cooldown(
    db: AsyncSession, user_id: int, pet_id: int, action: ActionType
) -> Optional[datetime]:
    row = await db.scalar(
        select(ActionCooldown).where(
            ActionCooldown.user_id == user_id,
            ActionCooldown.pet_id == pet_id,
            ActionCooldown.action_type == action,
        )
    )
    if row and row.available_at > utcnow():
        return row.available_at
    return None


async def perform_action(
    db: AsyncSession, pet: Pet, user: User, action: ActionType
) -> dict:
    cfg = ACTION_CONFIG[action]
    available_at = utcnow() + timedelta(hours=cfg["cooldown_hours"])

    stmt = (
        pg_insert(ActionCooldown)
        .values(
            user_id=user.id,
            pet_id=pet.id,
            action_type=action,
            available_at=available_at,
        )
        .on_conflict_do_update(
            index_elements=["user_id", "pet_id", "action_type"],
            set_={"available_at": available_at},
            where=(ActionCooldown.available_at <= utcnow()),
        )
    )
    result = await db.execute(stmt)

    if result.rowcount == 0:
        current = await db.scalar(
            select(ActionCooldown).where(
                ActionCooldown.user_id == user.id,
                ActionCooldown.pet_id == pet.id,
                ActionCooldown.action_type == action,
            )
        )
        return {"ok": False, "available_at": current.available_at}

    # Применяем дельты
    d = cfg["deltas"]
    pet.hunger    = max(0.0, min(100.0, pet.hunger    + d["hunger"]))
    pet.happiness = max(0.0, min(100.0, pet.happiness + d["happiness"]))
    pet.health    = max(0.0, min(100.0, pet.health    + d["health"]))
    pet.mood      = calc_mood(pet)
    pet.updated_at = utcnow()

    # Опыт и уровень (с XP modifier)
    xp_gain = int(10 * xp_multiplier(pet))
    pet.experience += xp_gain
    if pet.experience >= pet.level * 100:
        pet.experience = 0
        pet.level += 1

    # Монеты: +1 за каждое действие (с coin modifier)
    coin_gain = 1 if coin_multiplier(pet) >= 0.5 else 0
    if coin_gain > 0:
        await db.execute(
            sa_update(User).where(User.id == user.id).values(coins=User.coins + coin_gain)
        )

    # Логируем действие
    log = PetAction(
        pet_id=pet.id,
        user_id=user.id,
        user_name=user.first_name or user.username,
        action_type=action,
        hunger_delta=d["hunger"],
        happiness_delta=d["happiness"],
        health_delta=d["health"],
    )
    db.add(log)

    # Обновляем last_active_at владельца
    ownership = await db.scalar(
        select(PetOwnership).where(
            PetOwnership.user_id == user.id,
            PetOwnership.pet_id == pet.id,
        )
    )
    if ownership:
        ownership.last_active_at = utcnow()

    await db.commit()
    await db.refresh(pet)
    await db.refresh(user)

    return {"ok": True, "deltas": d, "coins": user.coins}


# ─── Streak ───────────────────────────────────────────────────────────────────

async def update_streak(db: AsyncSession, pet: Pet) -> None:
    today = utcnow().date()
    owners = (await db.scalars(
        select(PetOwnership).where(PetOwnership.pet_id == pet.id)
    )).all()

    if len(owners) < 2:
        return

    both_active_today = all(
        o.last_active_at and o.last_active_at.date() == today
        for o in owners
    )

    if not both_active_today:
        return

    last = pet.last_streak_date
    if last and last.date() == today:
        return

    yesterday = today - timedelta(days=1)
    if last and last.date() == yesterday:
        pet.streak += 1
    else:
        pet.streak = 1

    pet.last_streak_date = utcnow()
    await db.commit()