from datetime import timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth import get_current_user
from backend.db import get_db
from backend.deps import get_owned_pet
from backend.game import ACTIONS, perform_action
from backend.models import ActionType, Pet, PetAction, User
from backend.schemas import PetOut, UtcDatetime, pet_out

router = APIRouter(prefix="/pets/{pet_id}", tags=["actions"])


class ActionIn(BaseModel):
    action: ActionType


class ActionOut(BaseModel):
    coins: int
    pet: PetOut


class FeedEntry(BaseModel):
    user_id: int
    user_name: str | None
    action: str
    hunger_delta: float
    happiness_delta: float
    health_delta: float
    performed_at: UtcDatetime


@router.post("/actions", response_model=ActionOut)
async def do_action(
    body: ActionIn,
    pet: Pet = Depends(get_owned_pet),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.action not in ACTIONS:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Use the shop for this action")

    blocked_until = await perform_action(db, pet, user, body.action)
    if blocked_until:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            {
                "message": "Action on cooldown",
                "available_at": blocked_until.replace(tzinfo=timezone.utc).isoformat(),
            },
        )
    return ActionOut(coins=user.coins, pet=await pet_out(db, pet, user))


@router.get("/feed", response_model=list[FeedEntry])
async def action_feed(
    limit: int = Query(20, ge=1, le=100),
    pet: Pet = Depends(get_owned_pet),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.scalars(
        select(PetAction).where(PetAction.pet_id == pet.id).order_by(PetAction.performed_at.desc()).limit(limit)
    )
    return [
        FeedEntry(
            user_id=r.user_id,
            user_name=r.user_name,
            action=r.action_type.value,
            hunger_delta=r.hunger_delta,
            happiness_delta=r.happiness_delta,
            health_delta=r.health_delta,
            performed_at=r.performed_at,
        )
        for r in rows
    ]
