# api/routers/users.py
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from api.auth import get_current_user
from api.routers.pets import _get_pet_or_404, _assert_owner, _build_response
from core.database import get_db
from core.pet_logic import utcnow, can_play_game, spend_game_energy, coin_multiplier
from models import User, Pet, PetOwnership

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


class GameStartRequest(BaseModel):
    pet_id: int


class GameStartResponse(BaseModel):
    ok: bool
    energy: float
    coin_multiplier: float
    message: str | None = None


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


@router.post("/me/game-start", response_model=GameStartResponse)
async def start_game(
    body: GameStartRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Check energy and deduct it when player starts a game session."""
    pet = await _get_pet_or_404(body.pet_id, db)
    await _assert_owner(pet, user, db)

    if not can_play_game(pet):
        if pet.is_sleeping:
            msg = "Питомец спит! Разбуди его, чтобы играть."
        else:
            msg = f"Мало энергии ({pet.energy:.0f}). Покорми или дай отдохнуть."
        return GameStartResponse(
            ok=False,
            energy=pet.energy,
            coin_multiplier=coin_multiplier(pet),
            message=msg,
        )

    spend_game_energy(pet)
    await db.commit()
    await db.refresh(pet)

    return GameStartResponse(
        ok=True,
        energy=pet.energy,
        coin_multiplier=coin_multiplier(pet),
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

    # Apply coin multiplier based on pet stats
    # Find the user's pet to calculate modifier
    ownership = await db.scalar(
        select(PetOwnership).where(PetOwnership.user_id == user.id)
    )
    effective_amount = body.amount
    if ownership:
        pet = await db.scalar(select(Pet).where(Pet.id == ownership.pet_id))
        if pet:
            mult = coin_multiplier(pet)
            effective_amount = max(0, int(body.amount * mult))

    user.coins += effective_amount
    user.last_coin_claim = now

    if body.game_score is not None and body.game_score > user.game_best_score:
        user.game_best_score = body.game_score

    await db.commit()
    await db.refresh(user)

    return AddCoinsResponse(
        coins=user.coins,
        game_best_score=user.game_best_score,
    )