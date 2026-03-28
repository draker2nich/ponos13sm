# api/routers/sleep.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from api.auth import get_current_user
from api.routers.pets import _get_pet_or_404, _assert_owner, _build_response
from core.database import get_db
from core.pet_logic import utcnow
from models import User

router = APIRouter(prefix="/pets", tags=["sleep"])


@router.post("/{pet_id}/sleep")
async def toggle_sleep(
    pet_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    pet = await _get_pet_or_404(pet_id, db)
    await _assert_owner(pet, user, db)

    pet.is_sleeping = not pet.is_sleeping
    pet.updated_at = utcnow()

    await db.commit()
    await db.refresh(pet)

    return {
        "ok": True,
        "is_sleeping": pet.is_sleeping,
        "pet": await _build_response(pet, user, db),
    }