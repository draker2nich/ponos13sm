# api/routers/shop.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from api.auth import get_current_user
from api.routers.pets import _get_pet_or_404, _assert_owner, _build_response
from core.database import get_db
from core.pet_logic import utcnow
from models import User, PetAction, ActionType

router = APIRouter(prefix="/pets", tags=["shop"])


# ─── Каталоги ─────────────────────────────────────────────────────────────────

FOOD_ITEMS = {
    0:  {"emoji": "🍎", "cost": 2,  "hunger": 5},
    1:  {"emoji": "🥕", "cost": 2,  "hunger": 5},
    2:  {"emoji": "🌽", "cost": 3,  "hunger": 7},
    3:  {"emoji": "🍞", "cost": 3,  "hunger": 8},
    4:  {"emoji": "🥚", "cost": 4,  "hunger": 9},
    5:  {"emoji": "🧀", "cost": 5,  "hunger": 10},
    6:  {"emoji": "🍗", "cost": 6,  "hunger": 14},
    7:  {"emoji": "🐟", "cost": 7,  "hunger": 15},
    8:  {"emoji": "🍖", "cost": 8,  "hunger": 18},
    9:  {"emoji": "🥩", "cost": 10, "hunger": 20},
    10: {"emoji": "🍣", "cost": 12, "hunger": 22},
    11: {"emoji": "🍤", "cost": 12, "hunger": 22},
    12: {"emoji": "🥐", "cost": 5,  "hunger": 11},
    13: {"emoji": "🍕", "cost": 8,  "hunger": 16},
    14: {"emoji": "🌮", "cost": 9,  "hunger": 17},
    15: {"emoji": "🍔", "cost": 10, "hunger": 19},
    16: {"emoji": "🍰", "cost": 14, "hunger": 25},
    17: {"emoji": "🧁", "cost": 6,  "hunger": 12},
    18: {"emoji": "🍩", "cost": 4,  "hunger": 8},
    19: {"emoji": "🥗", "cost": 7,  "hunger": 13},
    20: {"emoji": "🍲", "cost": 15, "hunger": 30},
}

WASH_ITEMS = {
    0: {"emoji": "🧴", "cost": 5,  "health": 15},
    1: {"emoji": "🧽", "cost": 3,  "health": 10},
    2: {"emoji": "🧼", "cost": 4,  "health": 12},
}

ENERGY_ITEMS = {
    0: {"emoji": "☕", "cost": 3,  "energy": 12},
    1: {"emoji": "🧃", "cost": 4,  "energy": 15},
    2: {"emoji": "🍫", "cost": 5,  "energy": 18},
    3: {"emoji": "⚡", "cost": 8,  "energy": 30},
    4: {"emoji": "🥤", "cost": 6,  "energy": 22},
}


class BuyRequest(BaseModel):
    item_type: str   # "food" | "wash" | "energy"
    item_id: int


@router.post("/{pet_id}/buy")
async def buy_item(
    pet_id: int,
    body: BuyRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    pet = await _get_pet_or_404(pet_id, db)
    await _assert_owner(pet, user, db)

    # Найти предмет
    if body.item_type == "food":
        catalog = FOOD_ITEMS
    elif body.item_type == "wash":
        catalog = WASH_ITEMS
    elif body.item_type == "energy":
        catalog = ENERGY_ITEMS
    else:
        raise HTTPException(status_code=400, detail="Unknown item_type")

    item = catalog.get(body.item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Проверить баланс
    if user.coins < item["cost"]:
        raise HTTPException(status_code=400, detail="Not enough coins")

    # Списать монеты атомарно через SQL
    cost = item["cost"]
    result = await db.execute(
        sa_update(User)
        .where(User.id == user.id, User.coins >= cost)
        .values(coins=User.coins - cost)
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=400, detail="Not enough coins")

    # Применить эффект
    hunger_delta = 0.0
    happiness_delta = 0.0
    health_delta = 0.0

    if body.item_type == "food":
        hunger_delta = float(item["hunger"])
        pet.hunger = min(100.0, pet.hunger + hunger_delta)
        happiness_delta = 2.0
        pet.happiness = min(100.0, pet.happiness + happiness_delta)
    elif body.item_type == "wash":
        health_delta = float(item["health"])
        pet.health = min(100.0, pet.health + health_delta)
        happiness_delta = 3.0
        pet.happiness = min(100.0, pet.happiness + happiness_delta)
    elif body.item_type == "energy":
        energy_gain = float(item["energy"])
        pet.energy = min(100.0, pet.energy + energy_gain)
        happiness_delta = 1.0
        pet.happiness = min(100.0, pet.happiness + happiness_delta)

    pet.updated_at = utcnow()

    # Логируем как действие
    action_type = (
        ActionType.FEED if body.item_type == "food"
        else ActionType.WASH if body.item_type == "wash"
        else ActionType.PLAY  # energy items logged as PLAY
    )
    log = PetAction(
        pet_id=pet.id,
        user_id=user.id,
        user_name=user.first_name or user.username,
        action_type=action_type,
        hunger_delta=hunger_delta,
        happiness_delta=happiness_delta,
        health_delta=health_delta,
    )
    db.add(log)

    await db.commit()
    await db.refresh(pet)
    await db.refresh(user)

    return {
        "ok": True,
        "coins": user.coins,
        "item_emoji": item["emoji"],
        "pet": await _build_response(pet, user, db),
    }