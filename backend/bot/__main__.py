"""Local development: `python -m backend.bot` runs the bot with long polling.

Polling and a webhook can't be active at the same time, so the webhook is removed first.
To go back to production, set the webhook again (see README).
"""

import asyncio
import logging

from backend.bot import bot_session, dispatcher


async def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    async with bot_session() as bot:
        await bot.delete_webhook(drop_pending_updates=True)
        await dispatcher.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
