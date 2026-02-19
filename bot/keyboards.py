from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from core.config import settings


def open_app_keyboard(pet_id: int) -> InlineKeyboardMarkup:
    """Кнопка 'Открыть' — WebApp если есть HTTPS URL, иначе dev-заглушка."""
    url = settings.mini_app_url
    if url and "localhost" not in url and "127.0.0.1" not in url:
        return InlineKeyboardMarkup(inline_keyboard=[[
            InlineKeyboardButton(
                text="🐾 Открыть питомца",
                web_app=WebAppInfo(url=f"{url}?pet_id={pet_id}"),
            )
        ]])
    # Dev-режим без туннеля
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(
            text="🐾 Mini App (dev-режим)",
            callback_data="dev_app_stub",
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
    url = settings.mini_app_url
    if url and "localhost" not in url and "127.0.0.1" not in url:
        # ИСПРАВЛЕНО: используем mini_app_url из настроек вместо жёсткого URL
        accept_url = f"{url}?pet_id={pet_id}&action=accept"
        return InlineKeyboardMarkup(inline_keyboard=[[
            InlineKeyboardButton(
                text="🐾 Принять питомца",
                web_app=WebAppInfo(url=accept_url),
            )
        ]])
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(
            text="🐾 Принять питомца (dev)",
            callback_data="dev_app_stub",
        )
    ]])