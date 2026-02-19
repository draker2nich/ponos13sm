
import secrets
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from api.auth import get_current_user
from core.config import settings
from core.database import get_db
from core.pet_logic import utcnow
from models import Invite, InviteStatus, PetOwnership, User

router = APIRouter(prefix="/invites", tags=["invites"])


class InviteCreate(BaseModel):
    pet_id: int


class InviteResponse(BaseModel):
    token: str
    link: str
    expires_at: str


@router.post("", response_model=InviteResponse, status_code=status.HTTP_201_CREATED)
async def create_invite(
    body: InviteCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Создать инвайт-ссылку для питомца."""
    # Проверяем что пользователь — владелец
    own = await db.scalar(
        select(PetOwnership).where(
            PetOwnership.pet_id == body.pet_id,
            PetOwnership.user_id == user.id,
        )
    )
    if not own:
        raise HTTPException(status_code=403, detail="Not your pet")

    # Проверяем что у питомца ещё нет второго владельца
    owner_count = await db.scalar(
        select(func.count()).where(PetOwnership.pet_id == body.pet_id)
    )
    if owner_count >= 2:
        raise HTTPException(
            status_code=400,
            detail="This pet already has 2 owners",
        )

    token = secrets.token_urlsafe(16)
    expires_at = utcnow() + timedelta(hours=settings.invite_ttl_hours)

    invite = Invite(
        pet_id=body.pet_id,
        creator_id=user.id,
        token=token,
        expires_at=expires_at,
    )
    db.add(invite)
    await db.commit()

    return InviteResponse(
        token=token,
        link=f"{settings.invite_link}{token}",
        expires_at=expires_at.isoformat(),
    )


@router.post("/{token}/accept")
async def accept_invite(
    token: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Принять инвайт и стать совладельцем питомца."""
    invite = await db.scalar(
        select(Invite).where(Invite.token == token)
    )

    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    if invite.status != InviteStatus.PENDING:
        raise HTTPException(status_code=400, detail="Invite already used or expired")
    if invite.expires_at < utcnow():
        invite.status = InviteStatus.EXPIRED
        await db.commit()
        raise HTTPException(status_code=400, detail="Invite expired")
    if invite.creator_id == user.id:
        raise HTTPException(status_code=400, detail="Cannot accept your own invite")

    # Проверяем что пользователь ещё не владелец этого питомца
    already = await db.scalar(
        select(PetOwnership).where(
            PetOwnership.pet_id == invite.pet_id,
            PetOwnership.user_id == user.id,
        )
    )
    if already:
        raise HTTPException(status_code=400, detail="Already an owner")

    # Добавляем как второго владельца
    db.add(PetOwnership(pet_id=invite.pet_id, user_id=user.id, is_creator=False))

    invite.status = InviteStatus.ACCEPTED
    invite.accepted_by = user.id
    invite.accepted_at = utcnow()
    await db.commit()

    return {"ok": True, "pet_id": invite.pet_id}