from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth import get_current_user
from backend.db import get_db
from backend.models import User, utcnow

router = APIRouter(prefix="/users", tags=["users"])

MAX_COINS_PER_CLAIM = 10
CLAIM_INTERVAL = timedelta(seconds=3)
# The client reports game coins itself, so cap what a day of playing can earn
GAME_COINS_PER_DAY = 60


class MeOut(BaseModel):
    id: int
    username: str | None
    first_name: str | None
    coins: int
    game_best_score: int
    is_premium: bool


class CoinsIn(BaseModel):
    amount: int = Field(ge=0, le=MAX_COINS_PER_CLAIM)
    game_score: int | None = Field(default=None, ge=0)


class CoinsOut(BaseModel):
    coins: int
    game_best_score: int
    accepted: int  # how many of the requested coins were credited
    left_today: int


@router.get("/me", response_model=MeOut)
async def me(user: User = Depends(get_current_user)):
    return MeOut(
        id=user.id,
        username=user.username,
        first_name=user.first_name,
        coins=user.coins,
        game_best_score=user.game_best_score,
        is_premium=bool(user.is_premium),
    )


@router.post("/me/coins", response_model=CoinsOut)
async def claim_game_coins(body: CoinsIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Coins earned in the mini game. Rate-limited because the client can't be trusted."""
    now = utcnow()
    if body.amount and user.last_coin_claim and now - user.last_coin_claim < CLAIM_INTERVAL:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too fast")

    today = now.date()
    if user.game_coins_day != today:
        user.game_coins_day, user.game_coins_today = today, 0

    accepted = min(body.amount, GAME_COINS_PER_DAY - user.game_coins_today)
    if accepted:
        user.coins += accepted
        user.game_coins_today += accepted
        user.last_coin_claim = now
    if body.game_score is not None and body.game_score > user.game_best_score:
        user.game_best_score = body.game_score

    await db.commit()
    return CoinsOut(
        coins=user.coins,
        game_best_score=user.game_best_score,
        accepted=accepted,
        left_today=GAME_COINS_PER_DAY - user.game_coins_today,
    )
