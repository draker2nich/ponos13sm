"""Endpoints called by Vercel Cron (schedules live in vercel.json)."""

import hmac

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.bot import bot_session
from backend.bot.notifications import notify_hungry, notify_streak_at_risk
from backend.config import settings
from backend.db import get_db


def require_cron_secret(authorization: str | None = Header(default=None)) -> None:
    expected = f"Bearer {settings.cron_secret}"
    if not settings.cron_secret or not hmac.compare_digest(authorization or "", expected):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED)


router = APIRouter(prefix="/cron", tags=["cron"], dependencies=[Depends(require_cron_secret)])


@router.get("/hunger")
async def hunger_reminders(db: AsyncSession = Depends(get_db)):
    async with bot_session() as bot:
        return {"sent": await notify_hungry(db, bot)}


@router.get("/streak")
async def streak_reminders(db: AsyncSession = Depends(get_db)):
    async with bot_session() as bot:
        return {"sent": await notify_streak_at_risk(db, bot)}
