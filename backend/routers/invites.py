import secrets
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth import get_current_user
from backend.config import settings
from backend.db import get_db
from backend.deps import get_owned_pet
from backend.models import Invite, InviteStatus, Pet, PetOwnership, User, utcnow
from backend.schemas import UtcDatetime

router = APIRouter(prefix="/invites", tags=["invites"])

MAX_OWNERS = 2


class InviteIn(BaseModel):
    pet_id: int


class InviteOut(BaseModel):
    token: str
    link: str
    expires_at: UtcDatetime


class AcceptOut(BaseModel):
    pet_id: int


class InviteError(Exception):
    """A user-facing reason why an invite can't be accepted."""


async def owner_count(db: AsyncSession, pet_id: int) -> int:
    return await db.scalar(select(func.count()).select_from(PetOwnership).where(PetOwnership.pet_id == pet_id))


async def accept(db: AsyncSession, token: str, user_id: int) -> Invite:
    """Shared by the API and the bot. Raises InviteError, commits on success."""
    invite = await db.scalar(select(Invite).where(Invite.token == token).with_for_update())
    if invite is not None and invite.status is InviteStatus.ACCEPTED and invite.accepted_by == user_id:
        return invite  # opening the same invite twice is fine
    if invite is None or invite.status is not InviteStatus.PENDING:
        raise InviteError("Invite already used or invalid")
    if invite.expires_at < utcnow():
        invite.status = InviteStatus.EXPIRED
        await db.commit()
        raise InviteError("Invite expired")
    if invite.creator_id == user_id:
        raise InviteError("Cannot accept your own invite")

    already = await db.scalar(
        select(PetOwnership.id).where(PetOwnership.pet_id == invite.pet_id, PetOwnership.user_id == user_id)
    )
    if already:
        return invite
    if await owner_count(db, invite.pet_id) >= MAX_OWNERS:
        raise InviteError("This pet already has two owners")

    db.add(PetOwnership(pet_id=invite.pet_id, user_id=user_id, is_creator=False))
    invite.status = InviteStatus.ACCEPTED
    invite.accepted_by = user_id
    invite.accepted_at = utcnow()
    await db.commit()
    return invite


@router.post("", response_model=InviteOut, status_code=status.HTTP_201_CREATED)
async def create_invite(
    body: InviteIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    pet: Pet = await get_owned_pet(body.pet_id, user, db)
    if await owner_count(db, pet.id) >= MAX_OWNERS:
        raise HTTPException(status.HTTP_409_CONFLICT, "This pet already has two owners")

    invite = Invite(
        pet_id=pet.id,
        creator_id=user.id,
        token=secrets.token_urlsafe(16),
        expires_at=utcnow() + timedelta(hours=settings.invite_ttl_hours),
    )
    db.add(invite)
    await db.commit()
    return InviteOut(token=invite.token, link=settings.invite_link(invite.token), expires_at=invite.expires_at)


@router.post("/{token}/accept", response_model=AcceptOut)
async def accept_invite(token: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        invite = await accept(db, token, user.id)
    except InviteError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e)) from e
    return AcceptOut(pet_id=invite.pet_id)
