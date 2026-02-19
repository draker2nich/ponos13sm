# api/routers/pets.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from api.auth import get_current_user
from core.database import get_db
from core.pet_logic import calc_mood, utcnow
from models import ActionCooldown, ActionType, Pet, PetMood, PetOwnership, PetType, User

router = APIRouter(prefix="/pets", tags=["pets"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class PetCreate(BaseModel):
    name: str = Field(min_length=1, max_length=32)
    pet_type: PetType = PetType.CAT


class CooldownInfo(BaseModel):
    action: str
    available_at: str | None  # ISO строка или null если доступно


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
    # Владельцы
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

    # Кулдауны текущего пользователя
    cooldowns = []
    for action in ActionType:
        row = await db.scalar(
            select(ActionCooldown).where(
                ActionCooldown.user_id == user.id,
                ActionCooldown.pet_id == pet.id,
                ActionCooldown.action_type == action,
            )
        )
        available_at = None
        if row and row.available_at > utcnow():
            available_at = row.available_at.isoformat()
        cooldowns.append(CooldownInfo(action=action.value, available_at=available_at))

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
        owners=owners,
        cooldowns=cooldowns,
        updated_at=pet.updated_at.isoformat(),
    )


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED, response_model=PetResponse)
async def create_pet(
    body: PetCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Создать нового питомца. Один пользователь — максимум 1 питомец (free tier)."""
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
    await db.flush()  # получаем pet.id

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


