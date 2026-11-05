from urllib.parse import urlencode

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo

from backend.config import settings


def _app_url(**params: str | int) -> str:
    url = settings.mini_app_url
    query = urlencode({k: v for k, v in params.items() if v})
    return f"{url}{'&' if '?' in url else '?'}{query}" if query else url


def _app_button(text: str, **params: str | int) -> InlineKeyboardMarkup:
    # Telegram only opens Web Apps over HTTPS; locally fall back to an explanation
    if settings.mini_app_url.startswith("https://"):
        button = InlineKeyboardButton(text=text, web_app=WebAppInfo(url=_app_url(**params)))
    else:
        button = InlineKeyboardButton(text=text, callback_data="dev_app_stub")
    return InlineKeyboardMarkup(inline_keyboard=[[button]])


def open_app_keyboard(pet_id: int | None = None) -> InlineKeyboardMarkup:
    return _app_button("Открыть питомца", pet_id=pet_id or "")


def accept_invite_keyboard(token: str) -> InlineKeyboardMarkup:
    return _app_button("Принять приглашение", invite=token)
