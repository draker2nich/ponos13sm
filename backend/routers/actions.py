from datetime import timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth import get_current_user
from backend.bot.notifications import ACTION_VERBS, partner_activity_text, tell_partners
from backend.db import get_db
from backend.deps import get_owned_pet
from backend.game import ACTIONS, OnCooldown, perform_action
from backend.models import ActionType, Pet, User
from backend.schemas import FeedEntry, PetOut, pet_out, recent_activity

router = APIRouter(prefix="/pets/{pet_id}", tags=["actions"])


class ActionIn(BaseModel):
    action: ActionType


class ActionOut(BaseModel):
    coins: int
    streak_reward: int
    pet: PetOut


@router.post("/actions", response_model=ActionOut)
async def do_action(
    body: ActionIn,
    background: BackgroundTasks,
    pet: Pet = Depends(get_owned_pet),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.action not in ACTIONS:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Use the shop for this action")

    try:
        activity = await perform_action(db, pet, user, body.action)
    except OnCooldown as e:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            {"message": "Action on cooldown", "available_at": e.available_at.replace(tzinfo=timezone.utc).isoformat()},
        ) from e

    text = partner_activity_text(
        pet.name, user.display_name or "Партнёр", ACTION_VERBS[body.action], pet.streak, activity.streak_reward
    )
    background.add_task(tell_partners, activity.notify, text, pet.id)
    return ActionOut(coins=user.coins, streak_reward=activity.streak_reward, pet=await pet_out(db, pet, user))


@router.get("/feed", response_model=list[FeedEntry])
async def action_feed(
    limit: int = Query(20, ge=1, le=100),
    pet: Pet = Depends(get_owned_pet),
    db: AsyncSession = Depends(get_db),
):
    return await recent_activity(db, pet.id, limit)
