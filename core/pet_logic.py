# core/pet_logic.py
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select, func
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
    """Вычислить настроение по текущим параметрам."""
    hour = datetime.utcnow().hour
    if 0 <= hour < 7:
        return PetMood.SLEEPY
    if pet.hunger < 20:
        return PetMood.HUNGRY
    if pet.happiness < 30 or pet.health < 30:
        return PetMood.SAD
    if pet.hunger >= 70 and pet.happiness >= 70:
        return PetMood.HAPPY
    return PetMood.CONTENT


# ─── Decay ────────────────────────────────────────────────────────────────────

def apply_decay(pet: Pet, hours_passed: float) -> None:
    """Уменьшить параметры питомца за прошедшее время."""
    pet.hunger     = max(0.0, pet.hunger     - settings.hunger_decay_per_hour    * hours_passed)
    pet.happiness  = max(0.0, pet.happiness  - settings.happiness_decay_per_hour * hours_passed)
    pet.health     = max(0.0, pet.health     - settings.health_decay_per_hour    * hours_passed)
    pet.mood       = calc_mood(pet)
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
    """Вернуть время когда действие снова доступно, или None если доступно сейчас."""
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
    """
    Выполнить действие пользователя с питомцем.
    Возвращает {"ok": True, "deltas": {...}} или {"ok": False, "available_at": datetime}.
    """
    cfg = ACTION_CONFIG[action]

    # Проверка кулдауна
    cooldown_until = await get_cooldown(db, user.id, pet.id, action)
    if cooldown_until:
        return {"ok": False, "available_at": cooldown_until}

    # Применяем дельты
    d = cfg["deltas"]
    pet.hunger    = max(0.0, min(100.0, pet.hunger    + d["hunger"]))
    pet.happiness = max(0.0, min(100.0, pet.happiness + d["happiness"]))
    pet.health    = max(0.0, min(100.0, pet.health    + d["health"]))
    pet.mood      = calc_mood(pet)
    pet.updated_at = utcnow()

    # Опыт и уровень
    pet.experience += 10
    if pet.experience >= pet.level * 100:
        pet.experience = 0
        pet.level += 1

    # Логируем действие
    log = PetAction(
        pet_id=pet.id,
        user_id=user.id,
        action_type=action,
        hunger_delta=d["hunger"],
        happiness_delta=d["happiness"],
        health_delta=d["health"],
    )
    db.add(log)

    # Обновляем / создаём кулдаун
    cooldown_row = await db.scalar(
        select(ActionCooldown).where(
            ActionCooldown.user_id == user.id,
            ActionCooldown.pet_id == pet.id,
            ActionCooldown.action_type == action,
        )
    )
    available_at = utcnow() + timedelta(hours=cfg["cooldown_hours"])
    if cooldown_row:
        cooldown_row.available_at = available_at
    else:
        db.add(ActionCooldown(
            user_id=user.id,
            pet_id=pet.id,
            action_type=action,
            available_at=available_at,
        ))

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

    return {"ok": True, "deltas": d}


# ─── Streak ───────────────────────────────────────────────────────────────────

async def update_streak(db: AsyncSession, pet: Pet) -> None:
    """
    Проверить и обновить streak.
    Streak растёт только если ОБА владельца были активны сегодня.
    """
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
        return  # уже засчитали сегодня

    yesterday = today - timedelta(days=1)
    if last and last.date() == yesterday:
        pet.streak += 1
    else:
        pet.streak = 1  # streak сломан — начинаем заново

    pet.last_streak_date = utcnow()
    await db.commit()