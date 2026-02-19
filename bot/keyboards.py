from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from core.config import settings


def open_app_keyboard(pet_id: int) -> InlineKeyboardMarkup | None:
    """Кнопка 'Открыть' которая запускает Mini App на нужном питомце."""
    mini_app_url = settings.mini_app_url
    if not mini_app_url or "localhost" in mini_app_url:
        # В dev-режиме без ngrok просто не показываем кнопку
        return None
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(
            text="🐾 Открыть питомца",
            web_app=WebAppInfo(url=f"{mini_app_url}?pet_id={pet_id}"),
        )
    ]])


def invite_keyboard(invite_link: str) -> InlineKeyboardMarkup:
    """Кнопка поделиться инвайтом."""
    share_text = "Давай растить питомца вместе! 🐾"
    share_url = f"https://t.me/share/url?url={invite_link}&text={share_text}"
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📨 Отправить другу", url=share_url)],
        [InlineKeyboardButton(text="📋 Скопировать ссылку", callback_data=f"copy_invite:{invite_link}")],
    ])


def accept_pet_keyboard(pet_id: int) -> InlineKeyboardMarkup:
    """Кнопка принятия питомца для получателя инвайта."""
    mini_app_url = f"https://{settings.bot_username}.t.me/app?pet_id={pet_id}&action=accept"
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(
            text="🐾 Принять питомца",
            web_app=WebAppInfo(url=mini_app_url),
        )
    ]])
