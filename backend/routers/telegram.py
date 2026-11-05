import hmac

from fastapi import APIRouter, Header, HTTPException, Request, status

from backend.bot import bot_session, dispatcher
from backend.config import settings

router = APIRouter(prefix="/telegram", tags=["telegram"])


@router.post("/webhook", include_in_schema=False)
async def telegram_webhook(
    request: Request,
    secret: str | None = Header(default=None, alias="X-Telegram-Bot-Api-Secret-Token"),
):
    if settings.webhook_secret and not hmac.compare_digest(secret or "", settings.webhook_secret):
        raise HTTPException(status.HTTP_403_FORBIDDEN)

    update = await request.json()
    async with bot_session() as bot:
        await dispatcher.feed_webhook_update(bot, update)
    return {"ok": True}
