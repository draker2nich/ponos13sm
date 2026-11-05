from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth import get_current_user
from backend.db import get_db
from backend.deps import get_owned_pet
from backend.game import CATALOG, buy_item, find_item
from backend.models import Pet, User
from backend.schemas import PetOut, pet_out

router = APIRouter(tags=["shop"])

ItemKind = Literal["food", "wash"]


class CatalogItem(BaseModel):
    id: int
    emoji: str
    cost: int
    hunger: float
    happiness: float
    health: float


class BuyIn(BaseModel):
    item_type: ItemKind
    item_id: int


class BuyOut(BaseModel):
    coins: int
    item_emoji: str
    pet: PetOut


@router.get("/catalog", response_model=dict[ItemKind, list[CatalogItem]])
async def catalog():
    return {
        kind: [
            CatalogItem(id=i.id, emoji=i.emoji, cost=i.cost, **vars(i.deltas))
            for i in items
        ]
        for kind, items in CATALOG.items()
    }


@router.post("/pets/{pet_id}/buy", response_model=BuyOut)
async def buy(
    body: BuyIn,
    pet: Pet = Depends(get_owned_pet),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    item = find_item(body.item_type, body.item_id)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item not found")
    if not await buy_item(db, pet, user, body.item_type, item):
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED, "Not enough coins")
    return BuyOut(coins=user.coins, item_emoji=item.emoji, pet=await pet_out(db, pet, user))
