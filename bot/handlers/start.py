from aiogram import Router, F
from aiogram.filters import CommandStart, CommandObject
from aiogram.types import Message, CallbackQuery
from sqlalchemy import select

from core.database import AsyncSessionLocal
from core.pet_logic import utcnow
from models import Invite, InviteStatus, Pet, PetOwnership, User
from bot.keyboards import accept_pet_keyboard, open_app_keyboard

router = Router()


async def _get_or_create_user(tg_user) -> None:
    async with AsyncSessionLocal() as db:
        user = await db.scalar(select(User).where(User.id == tg_user.id))
        if not user:
            db.add(User(
                id=tg_user.id,
                username=tg_user.username,
                first_name=tg_user.first_name,
            ))
            await db.commit()


async def _get_user_pet_id(user_id: int) -> int | None:
    """Вернуть pet_id первого питомца пользователя, или None."""
    async with AsyncSessionLocal() as db:
        own = await db.scalar(
            select(PetOwnership).where(PetOwnership.user_id == user_id)
        )
        return own.pet_id if own else None


@router.message(CommandStart(deep_link=False))
async def cmd_start(msg: Message) -> None:
    await _get_or_create_user(msg.from_user)

    # Ищем существующего питомца — если есть, кидаем прямо к нему
    pet_id = await _get_user_pet_id(msg.from_user.id)

    if pet_id:
        await msg.answer(
            f"С возвращением, <b>{msg.from_user.first_name}</b>! 🐾\n\n"
            "Твой питомец скучал по тебе. Открывай!",
            reply_markup=open_app_keyboard(pet_id),
        )
    else:
        await msg.answer(
            f"Привет, <b>{msg.from_user.first_name}</b>! 🐾\n\n"
            "Здесь ты можешь завести виртуального питомца вместе с другом.\n\n"
            "Нажми кнопку ниже чтобы начать 👇",
            reply_markup=open_app_keyboard(0),
        )


@router.message(CommandStart(deep_link=True, deep_link_encoded=False))
async def cmd_start_invite(msg: Message, command: CommandObject) -> None:
    await _get_or_create_user(msg.from_user)

    args = command.args or ""
    if not args.startswith("inv_"):
        # Не инвайт-ссылка — обычный /start
        await cmd_start(msg)
        return

    token = args[4:]

    async with AsyncSessionLocal() as db:
        invite = await db.scalar(select(Invite).where(Invite.token == token))

        if not invite or invite.status != InviteStatus.PENDING:
            await msg.answer("😔 Эта ссылка уже использована или недействительна.")
            return

        if invite.expires_at < utcnow():
            invite.status = InviteStatus.EXPIRED
            await db.commit()
            await msg.answer("⏰ Срок действия ссылки истёк. Попроси друга отправить новую.")
            return

        if invite.creator_id == msg.from_user.id:
            await msg.answer("😅 Это твоя собственная ссылка — отправь её другу!")
            return

        already = await db.scalar(
            select(PetOwnership).where(
                PetOwnership.pet_id == invite.pet_id,
                PetOwnership.user_id == msg.from_user.id,
            )
        )
        if already:
            await msg.answer(
                "🐾 Ты уже ухаживаешь за этим питомцем!",
                reply_markup=open_app_keyboard(invite.pet_id),
            )
            return

        pet = await db.scalar(select(Pet).where(Pet.id == invite.pet_id))
        creator = await db.scalar(select(User).where(User.id == invite.creator_id))
        creator_name = creator.first_name if creator else "Твой друг"

    await msg.answer(
        f"🐾 <b>{creator_name}</b> приглашает тебя растить питомца вместе!\n\n"
        f"Питомец: <b>{pet.name}</b> ({pet.pet_type.value})\n"
        f"Уровень: {pet.level} · Streak: {pet.streak} 🔥\n\n"
        "Готов взять на себя ответственность? 👇",
        reply_markup=accept_pet_keyboard(invite.pet_id),
    )


@router.callback_query(F.data.startswith("copy_invite:"))
async def copy_invite_link(call: CallbackQuery) -> None:
    link = call.data.split(":", 1)[1]
    await call.answer(f"Ссылка: {link}", show_alert=True)


@router.callback_query(F.data == "dev_app_stub")
async def dev_app_stub(call: CallbackQuery) -> None:
    await call.answer(
        "🛠 Mini App работает локально.\n"
        "Открой http://localhost:5173 в браузере для разработки.\n\n"
        "Для полного теста используй Cloudflare Tunnel (см. README).",
        show_alert=True,
    )