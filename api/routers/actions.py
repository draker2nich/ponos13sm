from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from api.auth import get_current_user
from api.routers.pets import _get_pet_or_404, _assert_owner, _build_response
from core.database import get_db
from core.pet_logic import perform_action
from models import ActionType, PetAction, User

router = APIRouter(prefix="/pets", tags=["actions"])


class ActionRequest(BaseModel):
    action: ActionType


class ActionFeedEntry(BaseModel):
    user_id: int
    user_name: str | None  # ИСПРАВЛЕНО: добавлено имя пользователя
    action: str
    hunger_delta: float
    happiness_delta: float
    health_delta: float
    performed_at: str


@router.post("/{pet_id}/actions")
async def do_action(
    pet_id: int,
    body: ActionRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    pet = await _get_pet_or_404(pet_id, db)
    await _assert_owner(pet, user, db)

    result = await perform_action(db, pet, user, body.action)

    if not result["ok"]:
        raise HTTPException(
            status_code=429,
            detail={
                "message": "Action on cooldown",
                "available_at": result["available_at"].isoformat(),
            },
        )

    return {
        "ok": True,
        "deltas": result["deltas"],
        "pet": await _build_response(pet, user, db),
    }


@router.get("/{pet_id}/feed", response_model=list[ActionFeedEntry])
async def get_action_feed(
    pet_id: int,
    limit: int = 20,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    pet = await _get_pet_or_404(pet_id, db)
    await _assert_owner(pet, user, db)

    rows = (await db.scalars(
        select(PetAction)
        .where(PetAction.pet_id == pet_id)
        .order_by(PetAction.performed_at.desc())
        .limit(limit)
    )).all()

    return [
        ActionFeedEntry(
            user_id=r.user_id,
            user_name=r.user_name,  # берём из сохранённого поля, без JOIN
            action=r.action_type.value,
            hunger_delta=r.hunger_delta,
            happiness_delta=r.happiness_delta,
            health_delta=r.health_delta,
            performed_at=r.performed_at.isoformat(),
        )
        for r in rows
    ]