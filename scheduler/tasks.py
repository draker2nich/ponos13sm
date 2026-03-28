# scheduler/tasks.py
import logging
from datetime import timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from core.database import AsyncSessionLocal
from core.pet_logic import apply_decay, update_streak, utcnow
from models import Pet, PetOwnership, User

log = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="UTC")


async def _get_bot():
    from bot.main import bot
    return bot


async def _send(user_id: int, text: str, reply_markup=None) -> None:
    try:
        bot = await _get_bot()
        await bot.send_message(user_id, text, reply_markup=reply_markup)
    except Exception as e:
        log.warning(f"Failed to notify {user_id}: {e}")


# ─── Task: деградация параметров (каждый час) ─────────────────────────────────

@scheduler.scheduled_job("interval", hours=1, id="decay_pets")
async def decay_all_pets() -> None:
    async with AsyncSessionLocal() as db:
        pets = (await db.scalars(select(Pet))).all()
        for pet in pets:
            apply_decay(pet, hours_passed=1.0)
        await db.commit()
        log.info(f"Decay applied to {len(pets)} pets")


# ─── Task: уведомления о голоде (каждые 2 часа) ───────────────────────────────

@scheduler.scheduled_job("interval", hours=2, id="notify_hunger")
async def notify_hunger() -> None:
    from bot.keyboards import open_app_keyboard

    async with AsyncSessionLocal() as db:
        pets = (await db.scalars(select(Pet).where(Pet.hunger < 30))).all()

        for pet in pets:
            owners = (await db.scalars(
                select(PetOwnership).where(PetOwnership.pet_id == pet.id)
            )).all()

            emoji = "😿" if pet.hunger < 10 else "🍽"
            text = (
                f"{emoji} <b>{pet.name}</b> очень голоден!\n"
                f"Голод: {pet.hunger:.0f}/100\n\n"
                f"Покорми питомца, пока ему не стало хуже 🥺"
            )

            for o in owners:
                await _send(o.user_id, text, reply_markup=open_app_keyboard(pet.id))


# ─── Task: уведомление о низкой энергии (каждые 3 часа) ───────────────────────

@scheduler.scheduled_job("interval", hours=3, id="notify_low_energy")
async def notify_low_energy() -> None:
    from bot.keyboards import open_app_keyboard

    async with AsyncSessionLocal() as db:
        pets = (await db.scalars(
            select(Pet).where(Pet.energy < 20, Pet.is_sleeping == False)
        )).all()

        for pet in pets:
            owners = (await db.scalars(
                select(PetOwnership).where(PetOwnership.pet_id == pet.id)
            )).all()

            text = (
                f"⚡ <b>{pet.name}</b> устал!\n"
                f"Энергия: {pet.energy:.0f}/100\n\n"
                f"Уложи спать или дай энергетик 🧃"
            )

            for o in owners:
                await _send(o.user_id, text, reply_markup=open_app_keyboard(pet.id))


# ─── Task: уведомление об угрозе streak (раз в день, в 20:00 UTC) ─────────────

@scheduler.scheduled_job("cron", hour=20, minute=0, id="notify_streak")
async def notify_streak_danger() -> None:
    from bot.keyboards import open_app_keyboard

    today = utcnow().date()

    async with AsyncSessionLocal() as db:
        pets = (await db.scalars(select(Pet).where(Pet.streak > 0))).all()

        for pet in pets:
            owners = (await db.scalars(
                select(PetOwnership).where(PetOwnership.pet_id == pet.id)
            )).all()

            if len(owners) < 2:
                continue

            inactive = [
                o for o in owners
                if not o.last_active_at or o.last_active_at.date() < today
            ]

            if not inactive:
                continue

            active_owner = next((o for o in owners if o not in inactive), None)

            for o in inactive:
                text = (
                    f"🔥 Streak <b>{pet.streak} дней</b> под угрозой!\n\n"
                    f"<b>{pet.name}</b> ждёт тебя сегодня.\n"
                    f"Зайди и покорми питомца — иначе streak сгорит 😔"
                )
                await _send(o.user_id, text, reply_markup=open_app_keyboard(pet.id))

            if active_owner:
                partner = await db.scalar(
                    select(User).where(User.id == inactive[0].user_id)
                )
                partner_name = partner.first_name if partner else "Партнёр"
                text = (
                    f"👀 <b>{partner_name}</b> ещё не заходил сегодня.\n\n"
                    f"Streak <b>{pet.streak} дней</b> — напомни ему про <b>{pet.name}</b>!"
                )
                await _send(active_owner.user_id, text, reply_markup=open_app_keyboard(pet.id))


# ─── Task: обновление streak (каждый день в 23:55 UTC) ────────────────────────

@scheduler.scheduled_job("cron", hour=23, minute=55, id="update_streaks")
async def update_all_streaks() -> None:
    async with AsyncSessionLocal() as db:
        pets = (await db.scalars(select(Pet))).all()
        for pet in pets:
            await update_streak(db, pet)
        log.info(f"Streaks updated for {len(pets)} pets")


# ─── Task: обновление возраста питомца (каждый день в полночь) ────────────────

@scheduler.scheduled_job("cron", hour=0, minute=0, id="age_pets")
async def age_all_pets() -> None:
    async with AsyncSessionLocal() as db:
        pets = (await db.scalars(select(Pet))).all()
        for pet in pets:
            pet.age_days += 1
        await db.commit()
        log.info(f"Aged {len(pets)} pets")


def start_scheduler() -> None:
    scheduler.start()
    log.info("Scheduler started")