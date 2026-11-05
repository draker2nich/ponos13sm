from html import escape

from aiogram import F, Router
from aiogram.filters import CommandObject, CommandStart
from aiogram.types import CallbackQuery, Message
from aiogram.types import User as TgUser
from sqlalchemy import select

from backend.bot.keyboards import accept_invite_keyboard, open_app_keyboard
from backend.db import SessionLocal
from backend.models import Invite, InviteStatus, Pet, PetOwnership, User, utcnow

router = Router()

PET_NAMES = {"cat": "кот", "dog": "собака", "bunny": "кролик", "bear": "медведь"}


async def _ensure_user(tg_user: TgUser) -> int | None:
    """Create the user if needed and return the id of their first pet."""
    async with SessionLocal() as db:
        user = await db.get(User, tg_user.id)
        if user is None:
            db.add(User(id=tg_user.id, username=tg_user.username, first_name=tg_user.first_name, coins=0))
            await db.commit()
            return None
        return await db.scalar(
            select(PetOwnership.pet_id).where(PetOwnership.user_id == tg_user.id).order_by(PetOwnership.joined_at)
        )


async def _greet(msg: Message, pet_id: int | None) -> None:
    name = escape(msg.from_user.first_name or "")
    if pet_id:
        text = f"С возвращением, <b>{name}</b>. Питомец ждёт тебя."
    else:
        text = (
            f"Привет, <b>{name}</b>.\n\n"
            "Здесь можно завести виртуального питомца и растить его вдвоём с другом: "
            "кормить, играть, гладить и не терять общий стрик."
        )
    await msg.answer(text, reply_markup=open_app_keyboard(pet_id))


@router.message(CommandStart(deep_link=True))
async def start_with_link(msg: Message, command: CommandObject) -> None:
    pet_id = await _ensure_user(msg.from_user)
    args = command.args or ""
    if not args.startswith("inv_"):
        await _greet(msg, pet_id)
        return

    token = args.removeprefix("inv_")
    async with SessionLocal() as db:
        invite = await db.scalar(select(Invite).where(Invite.token == token))
        if invite is None or invite.status is not InviteStatus.PENDING:
            await msg.answer("Эта ссылка уже использована или недействительна.")
            return
        if invite.expires_at < utcnow():
            await msg.answer("Срок действия ссылки истёк. Попроси друга прислать новую.")
            return
        if invite.creator_id == msg.from_user.id:
            await msg.answer("Это твоя ссылка — отправь её другу.")
            return

        pet = await db.get(Pet, invite.pet_id)
        creator = await db.get(User, invite.creator_id)

    creator_name = escape(creator.display_name if creator else "Твой друг")
    await msg.answer(
        f"<b>{creator_name}</b> зовёт тебя растить питомца вместе.\n\n"
        f"{escape(pet.name)}, {PET_NAMES.get(pet.pet_type.value, '')} · уровень {pet.level}",
        reply_markup=accept_invite_keyboard(token),
    )


@router.message(CommandStart())
async def start(msg: Message) -> None:
    await _greet(msg, await _ensure_user(msg.from_user))


@router.callback_query(F.data == "dev_app_stub")
async def dev_app_stub(call: CallbackQuery) -> None:
    await call.answer(
        "Mini App открывается только по HTTPS. Укажи MINI_APP_URL с https:// "
        "(например, через cloudflared tunnel) или открой http://localhost:5173/app/ в браузере.",
        show_alert=True,
    )
