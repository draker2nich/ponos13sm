"""Pet rules: stat decay, mood, actions, shop purchases and the shared streak.

Stats are not decayed by a background job. Whenever a pet is loaded we bring it up
to date with `sync_pet`, using the time elapsed since `pet.decayed_at`. This keeps the
backend stateless, which is what a serverless deployment needs.
"""

from dataclasses import dataclass
from datetime import date, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.models import ActionCooldown, ActionType, Pet, PetAction, PetMood, PetOwnership, User, utcnow

XP_PER_ACTION = 10
COINS_PER_ACTION = 1


@dataclass(frozen=True)
class Deltas:
    hunger: float = 0.0
    happiness: float = 0.0
    health: float = 0.0


@dataclass(frozen=True)
class ActionRule:
    cooldown: timedelta
    deltas: Deltas


ACTIONS: dict[ActionType, ActionRule] = {
    ActionType.FEED: ActionRule(timedelta(hours=settings.feed_cooldown_hours), Deltas(hunger=30, happiness=5)),
    ActionType.PLAY: ActionRule(timedelta(hours=settings.play_cooldown_hours), Deltas(hunger=-5, happiness=25, health=5)),
    ActionType.PET: ActionRule(timedelta(hours=settings.pet_cooldown_hours), Deltas(happiness=15, health=10)),
}


@dataclass(frozen=True)
class ShopItem:
    id: int
    emoji: str
    cost: int
    deltas: Deltas


def _food(id: int, emoji: str, cost: int, hunger: int) -> ShopItem:
    return ShopItem(id, emoji, cost, Deltas(hunger=hunger, happiness=2))


def _soap(id: int, emoji: str, cost: int, health: int) -> ShopItem:
    return ShopItem(id, emoji, cost, Deltas(health=health, happiness=3))


CATALOG: dict[str, list[ShopItem]] = {
    "food": [
        _food(0, "🍎", 2, 5), _food(1, "🥕", 2, 5), _food(2, "🌽", 3, 7), _food(3, "🍞", 3, 8),
        _food(4, "🥚", 4, 9), _food(5, "🧀", 5, 10), _food(6, "🍗", 6, 14), _food(7, "🐟", 7, 15),
        _food(8, "🍖", 8, 18), _food(9, "🥩", 10, 20), _food(10, "🍣", 12, 22), _food(11, "🍤", 12, 22),
        _food(12, "🥐", 5, 11), _food(13, "🍕", 8, 16), _food(14, "🌮", 9, 17), _food(15, "🍔", 10, 19),
        _food(16, "🍰", 14, 25), _food(17, "🧁", 6, 12), _food(18, "🍩", 4, 8), _food(19, "🥗", 7, 13),
        _food(20, "🍲", 15, 30),
    ],
    "wash": [
        _soap(0, "🧴", 5, 15), _soap(1, "🧽", 3, 10), _soap(2, "🧼", 4, 12),
    ],
}
PURCHASE_ACTION = {"food": ActionType.FEED, "wash": ActionType.WASH}


def find_item(kind: str, item_id: int) -> ShopItem | None:
    return next((item for item in CATALOG.get(kind, []) if item.id == item_id), None)


# ─── Stats ───────────────────────────────────────────────────────────────────

def _clamp(value: float) -> float:
    return max(0.0, min(100.0, value))


def calc_mood(pet: Pet, now: datetime) -> PetMood:
    if pet.is_sleeping or now.hour < 7:
        return PetMood.SLEEPY
    if pet.hunger < 20:
        return PetMood.HUNGRY
    if pet.happiness < 30 or pet.health < 30:
        return PetMood.SAD
    if pet.hunger >= 70 and pet.happiness >= 70:
        return PetMood.HAPPY
    return PetMood.CONTENT


def sync_pet(pet: Pet, now: datetime | None = None) -> None:
    """Apply the stat decay accumulated since the last sync."""
    now = now or utcnow()
    hours = max(0.0, (now - pet.decayed_at).total_seconds() / 3600) if pet.decayed_at else 0.0
    rate = hours * (settings.sleep_decay_multiplier if pet.is_sleeping else 1.0)

    pet.hunger = _clamp(pet.hunger - settings.hunger_decay_per_hour * rate)
    pet.happiness = _clamp(pet.happiness - settings.happiness_decay_per_hour * rate)
    pet.health = _clamp(pet.health - settings.health_decay_per_hour * rate)
    pet.mood = calc_mood(pet, now)
    pet.decayed_at = now


def _apply(pet: Pet, deltas: Deltas, now: datetime) -> None:
    pet.hunger = _clamp(pet.hunger + deltas.hunger)
    pet.happiness = _clamp(pet.happiness + deltas.happiness)
    pet.health = _clamp(pet.health + deltas.health)
    pet.mood = calc_mood(pet, now)


def current_streak(pet: Pet, today: date | None = None) -> int:
    """The streak survives only if both owners showed up yesterday or today."""
    today = today or utcnow().date()
    if not pet.last_streak_date or pet.last_streak_date.date() < today - timedelta(days=1):
        return 0
    return pet.streak


def age_days(pet: Pet, now: datetime | None = None) -> int:
    return ((now or utcnow()) - pet.created_at).days if pet.created_at else 0


# ─── Activity ────────────────────────────────────────────────────────────────

async def register_activity(db: AsyncSession, pet: Pet, user: User, now: datetime) -> None:
    """Mark the owner active today and extend the streak once both owners have been in."""
    owners = (await db.scalars(select(PetOwnership).where(PetOwnership.pet_id == pet.id))).all()
    for owner in owners:
        if owner.user_id == user.id:
            owner.last_active_at = now

    today = now.date()
    both_active = len(owners) >= 2 and all(o.last_active_at and o.last_active_at.date() == today for o in owners)
    already_counted = pet.last_streak_date and pet.last_streak_date.date() == today
    if not both_active or already_counted:
        return

    pet.streak = current_streak(pet, today) + 1
    pet.last_streak_date = now


def _log(pet: Pet, user: User, action: ActionType, deltas: Deltas) -> PetAction:
    return PetAction(
        pet_id=pet.id,
        user_id=user.id,
        user_name=user.display_name,
        action_type=action,
        hunger_delta=deltas.hunger,
        happiness_delta=deltas.happiness,
        health_delta=deltas.health,
    )


async def claim_cooldown(db: AsyncSession, user: User, pet: Pet, action: ActionType, now: datetime) -> datetime | None:
    """Atomically start the cooldown. Returns the time the action unlocks if it is still on cooldown."""
    available_at = now + ACTIONS[action].cooldown
    result = await db.execute(
        insert(ActionCooldown)
        .values(user_id=user.id, pet_id=pet.id, action_type=action, available_at=available_at)
        .on_conflict_do_update(
            index_elements=["user_id", "pet_id", "action_type"],
            set_={"available_at": available_at},
            where=ActionCooldown.available_at <= now,
        )
    )
    if result.rowcount:
        return None
    return await db.scalar(
        select(ActionCooldown.available_at).where(
            ActionCooldown.user_id == user.id,
            ActionCooldown.pet_id == pet.id,
            ActionCooldown.action_type == action,
        )
    )


async def perform_action(db: AsyncSession, pet: Pet, user: User, action: ActionType) -> datetime | None:
    """Feed / play / pet. Returns `available_at` when the action is on cooldown, otherwise None."""
    now = utcnow()
    blocked_until = await claim_cooldown(db, user, pet, action, now)
    if blocked_until:
        await db.commit()  # keep the decay applied while loading the pet
        return blocked_until

    deltas = ACTIONS[action].deltas
    _apply(pet, deltas, now)

    pet.experience += XP_PER_ACTION
    if pet.experience >= pet.level * 100:
        pet.experience = 0
        pet.level += 1

    await db.execute(update(User).where(User.id == user.id).values(coins=User.coins + COINS_PER_ACTION))
    db.add(_log(pet, user, action, deltas))
    await register_activity(db, pet, user, now)
    await db.commit()
    await db.refresh(user)
    return None


async def buy_item(db: AsyncSession, pet: Pet, user: User, kind: str, item: ShopItem) -> bool:
    """Spend coins on an item and apply it to the pet. Returns False if the user can't afford it."""
    paid = await db.execute(
        update(User).where(User.id == user.id, User.coins >= item.cost).values(coins=User.coins - item.cost)
    )
    if not paid.rowcount:
        await db.commit()
        return False

    now = utcnow()
    _apply(pet, item.deltas, now)
    db.add(_log(pet, user, PURCHASE_ACTION[kind], item.deltas))
    await register_activity(db, pet, user, now)
    await db.commit()
    await db.refresh(user)
    return True
