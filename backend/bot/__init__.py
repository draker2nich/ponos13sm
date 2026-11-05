"""Telegram bot. In production it runs on webhooks (see routers/telegram.py);
`python -m backend.bot` starts long polling for local development."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode

from backend.bot.handlers import router
from backend.config import settings

dispatcher = Dispatcher()
dispatcher.include_router(router)


@asynccontextmanager
async def bot_session() -> AsyncIterator[Bot]:
    """A short-lived Bot whose HTTP session is closed afterwards — safe in serverless functions."""
    bot = Bot(settings.bot_token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    try:
        yield bot
    finally:
        await bot.session.close()
