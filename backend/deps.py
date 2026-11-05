from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth import get_current_user
from backend.db import get_db
from backend.game import sync_pet
from backend.models import Pet, PetOwnership, User


async def get_owned_pet(
    pet_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Pet:
    """Load a pet the current user owns, with its stats brought up to date."""
    pet = await db.scalar(
        select(Pet)
        .join(PetOwnership, PetOwnership.pet_id == Pet.id)
        .where(Pet.id == pet_id, PetOwnership.user_id == user.id)
    )
    if pet is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pet not found")
    sync_pet(pet)
    return pet
