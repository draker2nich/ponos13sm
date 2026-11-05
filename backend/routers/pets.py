from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth import get_current_user
from backend.db import get_db
from backend.deps import get_owned_pet
from backend.game import sync_pet
from backend.models import ActionCooldown, Invite, Pet, PetAction, PetOwnership, PetType, User
from backend.schemas import PetOut, pet_out

router = APIRouter(prefix="/pets", tags=["pets"])


class PetCreate(BaseModel):
    name: str = Field(min_length=1, max_length=32)
    pet_type: PetType = PetType.CAT


@router.get("/my", response_model=list[PetOut])
async def my_pets(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    pets = (
        await db.scalars(
            select(Pet)
            .join(PetOwnership, PetOwnership.pet_id == Pet.id)
            .where(PetOwnership.user_id == user.id)
            .order_by(PetOwnership.joined_at)
        )
    ).all()
    for pet in pets:
        sync_pet(pet)
    await db.commit()
    return [await pet_out(db, pet, user) for pet in pets]


@router.post("", status_code=status.HTTP_201_CREATED, response_model=PetOut)
async def create_pet(body: PetCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    has_pet = await db.scalar(select(PetOwnership.id).where(PetOwnership.user_id == user.id).limit(1))
    if has_pet and not user.is_premium:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Free users can have only one pet")

    pet = Pet(name=body.name.strip(), pet_type=body.pet_type)
    db.add(pet)
    await db.flush()
    db.add(PetOwnership(pet_id=pet.id, user_id=user.id, is_creator=True))
    await db.commit()
    await db.refresh(pet)
    return await pet_out(db, pet, user)


@router.get("/{pet_id}", response_model=PetOut)
async def get_pet(
    pet: Pet = Depends(get_owned_pet),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.commit()
    return await pet_out(db, pet, user)


@router.post("/{pet_id}/sleep", response_model=PetOut)
async def toggle_sleep(
    pet: Pet = Depends(get_owned_pet),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # get_owned_pet already applied decay up to now, so the new rate starts from here
    pet.is_sleeping = not pet.is_sleeping
    sync_pet(pet)
    await db.commit()
    return await pet_out(db, pet, user)


@router.delete("/{pet_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pet(
    pet: Pet = Depends(get_owned_pet),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    is_creator = await db.scalar(
        select(PetOwnership.is_creator).where(PetOwnership.pet_id == pet.id, PetOwnership.user_id == user.id)
    )
    if not is_creator:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the creator can delete this pet")

    for model in (ActionCooldown, PetAction, Invite, PetOwnership):
        await db.execute(delete(model).where(model.pet_id == pet.id))
    await db.delete(pet)
    await db.commit()
