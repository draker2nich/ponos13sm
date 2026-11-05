"""Reminders sent by the daily cron jobs (see routers/cron.py)."""

import logging
from html import escape

from aiogram import Bot
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.bot import bot_session
from backend.bot.keyboards import open_app_keyboard
from backend.game import current_streak, sync_pet
from backend.models import ActionType, Pet, PetOwnership, User, utcnow

log = logging.getLogger(__name__)

HUNGRY_BELOW = 30


async def _send(bot: Bot, user_id: int, text: str, pet_id: int) -> bool:
    try:
        await bot.send_message(user_id, text, reply_markup=open_app_keyboard(pet_id))
        return True
    except Exception as e:  # blocked bot, deleted account, etc.
        log.warning("Failed to notify %s: %s", user_id, e)
        return False


async def _owners(db: AsyncSession, pet_id: int) -> list[tuple[PetOwnership, User]]:
    rows = await db.execute(
        select(PetOwnership, User).join(User, User.id == PetOwnership.user_id).where(PetOwnership.pet_id == pet_id)
    )
    return list(rows.tuples())


async def notify_hungry(db: AsyncSession, bot: Bot) -> int:
    pets = (await db.scalars(select(Pet))).all()
    for pet in pets:
        sync_pet(pet)
    await db.commit()

    sent = 0
    for pet in pets:
        if pet.hunger >= HUNGRY_BELOW:
            continue
        text = f"<b>{escape(pet.name)}</b> проголодался — сытость {pet.hunger:.0f} из 100. Загляни покормить."
        for own, _ in await _owners(db, pet.id):
            sent += await _send(bot, own.user_id, text, pet.id)
    return sent


async def notify_streak_at_risk(db: AsyncSession, bot: Bot) -> int:
    today = utcnow().date()
    sent = 0
    for pet in (await db.scalars(select(Pet).where(Pet.streak > 0))).all():
        streak = current_streak(pet, today)
        owners = await _owners(db, pet.id)
        # With a freeze in stock a missed day doesn't burn the streak, so no alarm
        if not streak or len(owners) < 2 or pet.streak_freezes:
            continue

        missing = [(o, u) for o, u in owners if not o.last_active_at or o.last_active_at.date() < today]
        present = [(o, u) for o, u in owners if (o, u) not in missing]
        if not missing:
            continue

        name = escape(pet.name)
        for own, _ in missing:
            text = f"Стрик {streak} дн. сгорит сегодня. <b>{name}</b> ждёт тебя."
            sent += await _send(bot, own.user_id, text, pet.id)
        for own, _ in present:
            partner = escape(missing[0][1].display_name or "Партнёр")
            text = f"<b>{partner}</b> сегодня ещё не заходил. Напомни про <b>{name}</b>, чтобы сохранить стрик {streak} дн."
            sent += await _send(bot, own.user_id, text, pet.id)
    return sent


# ─── Partner activity ────────────────────────────────────────────────────────

ACTION_VERBS = {
    ActionType.FEED: "покормил(а)",
    ActionType.PLAY: "поиграл(а)",
    ActionType.PET: "погладил(а)",
}
PURCHASE_VERBS = {"food": "угостил(а)", "wash": "искупал(а)"}


def partner_activity_text(pet_name: str, actor: str, verb: str, streak: int = 0, reward: int = 0) -> str:
    text = f"<b>{escape(pet_name)}</b> · {escape(actor)} {verb}"
    if reward:
        text += f"\n\nСтрик {streak} дн. — вам обоим +{reward} монет"
    return text


async def tell_partners(user_ids: list[int], text: str, pet_id: int) -> None:
    """Runs after the response is sent (FastAPI background task)."""
    if not user_ids:
        return
    async with bot_session() as bot:
        for user_id in user_ids:
            await _send(bot, user_id, text, pet_id)
