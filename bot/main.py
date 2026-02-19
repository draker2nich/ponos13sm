
# bot/main.py
import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode

from core.config import settings
from core.database import init_db
from scheduler.tasks import start_scheduler
from bot.handlers import start

logging.basicConfig(level=logging.INFO)

bot = Bot(
    token=settings.bot_token,
    default=DefaultBotProperties(parse_mode=ParseMode.HTML),
)
dp = Dispatcher()
dp.include_router(start.router)


async def main() -> None:
    await init_db()
    start_scheduler()
    await dp.start_polling(bot, skip_updates=True)


if __name__ == "__main__":
    import sys
    import logging
    logging.basicConfig(
        level=logging.DEBUG,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        stream=sys.stdout,
    )
    asyncio.run(main())