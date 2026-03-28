# api/routers/users.py
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from api.auth import get_current_user
from core.database import get_db
from core.pet_logic import utcnow
from models import User

router = APIRouter(prefix="/users", tags=["users"])


class MeResponse(BaseModel):
    id: int
    username: str | None
    first_name: str | None
    coins: int
    game_best_score: int
    is_premium: bool


class AddCoinsRequest(BaseModel):
    amount: int
    game_score: int | None = None


class AddCoinsResponse(BaseModel):
    coins: int
    game_best_score: int


@router.get("/me", response_model=MeResponse)
async def get_me(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return MeResponse(
        id=user.id,
        username=user.username,
        first_name=user.first_name,
        coins=user.coins,
        game_best_score=user.game_best_score,
        is_premium=user.is_premium,
    )


@router.post("/me/coins", response_model=AddCoinsResponse)
async def add_coins(
    body: AddCoinsRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.amount < 0:
        raise HTTPException(status_code=400, detail="amount must be >= 0")
    if body.amount > 10:
        raise HTTPException(status_code=400, detail="Too many coins in one request")

    # Rate limit: не чаще раза в 3 секунды
    now = utcnow()
    if user.last_coin_claim and (now - user.last_coin_claim) < timedelta(seconds=3):
        raise HTTPException(status_code=429, detail="Too fast")

    user.coins += body.amount
    user.last_coin_claim = now

    if body.game_score is not None and body.game_score > user.game_best_score:
        user.game_best_score = body.game_score

    await db.commit()
    await db.refresh(user)

    return AddCoinsResponse(
        coins=user.coins,
        game_best_score=user.game_best_score,
    )