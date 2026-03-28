# api/routers/pets.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from api.auth import get_current_user
from core.database import get_db
from core.pet_logic import utcnow
from models import (
    ActionCooldown, ActionType, Invite, Pet, PetAction,
    PetOwnership, PetType, User,
)

router = APIRouter(prefix="/pets", tags=["pets"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class PetCreate(BaseModel):
    name: str = Field(min_length=1, max_length=32)
    pet_type: PetType = PetType.CAT


class CooldownInfo(BaseModel):
    action: str
    available_at: str | None


class PetResponse(BaseModel):
    id: int
    name: str
    pet_type: str
    hunger: float
    happiness: float
    health: float
    level: int
    experience: int
    age_days: int
    streak: int
    mood: str
    is_sleeping: bool
    owners: list[dict]
    cooldowns: list[CooldownInfo]
    updated_at: str


# ─── Helpers ──────────────────────────────────────────────────────────────────

async def _get_pet_or_404(pet_id: int, db: AsyncSession) -> Pet:
    pet = await db.scalar(select(Pet).where(Pet.id == pet_id))
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    return pet


async def _assert_owner(pet: Pet, user: User, db: AsyncSession) -> None:
    own = await db.scalar(
        select(PetOwnership).where(
            PetOwnership.pet_id == pet.id,
            PetOwnership.user_id == user.id,
        )
    )
    if not own:
        raise HTTPException(status_code=403, detail="Not your pet")


async def _build_response(pet: Pet, user: User, db: AsyncSession) -> PetResponse:
    ownerships = (await db.scalars(
        select(PetOwnership).where(PetOwnership.pet_id == pet.id)
    )).all()
    owners = [
        {
            "user_id": o.user_id,
            "is_creator": o.is_creator,
            "last_active_at": o.last_active_at.isoformat() if o.last_active_at else None,
        }
        for o in ownerships
    ]

    cooldown_rows = (await db.scalars(
        select(ActionCooldown).where(
            ActionCooldown.user_id == user.id,
            ActionCooldown.pet_id == pet.id,
        )
    )).all()
    cd_map = {r.action_type: r for r in cooldown_rows}

    now = utcnow()
    cooldowns = [
        CooldownInfo(
            action=action.value,
            available_at=(
                cd_map[action].available_at.isoformat()
                if action in cd_map and cd_map[action].available_at > now
                else None
            ),
        )
        for action in ActionType
    ]

    return PetResponse(
        id=pet.id,
        name=pet.name,
        pet_type=pet.pet_type.value,
        hunger=pet.hunger,
        happiness=pet.happiness,
        health=pet.health,
        level=pet.level,
        experience=pet.experience,
        age_days=pet.age_days,
        streak=pet.streak,
        mood=pet.mood.value,
        is_sleeping=pet.is_sleeping,
        owners=owners,
        cooldowns=cooldowns,
        updated_at=pet.updated_at.isoformat(),
    )


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/my", response_model=list[PetResponse])
async def get_my_pets(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ownerships = (await db.scalars(
        select(PetOwnership).where(PetOwnership.user_id == user.id)
    )).all()

    pets = []
    for own in ownerships:
        pet = await db.scalar(select(Pet).where(Pet.id == own.pet_id))
        if pet:
            pets.append(await _build_response(pet, user, db))

    return pets


@router.post("", status_code=status.HTTP_201_CREATED, response_model=PetResponse)
async def create_pet(
    body: PetCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.scalar(
        select(PetOwnership).where(PetOwnership.user_id == user.id)
    )
    if existing and not user.is_premium:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Free users can have only 1 pet. Upgrade to Premium.",
        )

    pet = Pet(name=body.name, pet_type=body.pet_type)
    db.add(pet)
    await db.flush()

    ownership = PetOwnership(pet_id=pet.id, user_id=user.id, is_creator=True)
    db.add(ownership)
    await db.commit()
    await db.refresh(pet)

    return await _build_response(pet, user, db)


@router.get("/{pet_id}", response_model=PetResponse)
async def get_pet(
    pet_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    pet = await _get_pet_or_404(pet_id, db)
    await _assert_owner(pet, user, db)
    return await _build_response(pet, user, db)


@router.delete("/{pet_id}")
async def delete_pet(
    pet_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    pet = await _get_pet_or_404(pet_id, db)

    # Только создатель может удалить
    ownership = await db.scalar(
        select(PetOwnership).where(
            PetOwnership.pet_id == pet.id,
            PetOwnership.user_id == user.id,
            PetOwnership.is_creator == True,
        )
    )
    if not ownership:
        raise HTTPException(status_code=403, detail="Only the creator can delete this pet")

    # Удаляем все связанные данные
    await db.execute(delete(ActionCooldown).where(ActionCooldown.pet_id == pet_id))
    await db.execute(delete(PetAction).where(PetAction.pet_id == pet_id))
    await db.execute(delete(Invite).where(Invite.pet_id == pet_id))
    await db.execute(delete(PetOwnership).where(PetOwnership.pet_id == pet_id))
    await db.delete(pet)
    await db.commit()

    return {"ok": True}