"""Numbers for the owner, protected by the same secret as the cron jobs:

    curl -H "Authorization: Bearer $CRON_SECRET" https://tubric.tech/api/admin/stats
"""

from datetime import timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db import get_db
from backend.game import current_streak
from backend.models import Pet, PetAction, PetOwnership, User, utcnow
from backend.routers.cron import require_cron_secret

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_cron_secret)])

STREAK_BUCKETS = (("0", 0, 0), ("1-2", 1, 2), ("3-6", 3, 6), ("7-13", 7, 13), ("14-29", 14, 29), ("30+", 30, 10**9))


@router.get("/stats")
async def stats(db: AsyncSession = Depends(get_db)):
    now = utcnow()
    day_ago = now - timedelta(days=1)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    async def count(query) -> int:
        return await db.scalar(select(func.count()).select_from(query.subquery()))

    owners_per_pet = select(PetOwnership.pet_id).group_by(PetOwnership.pet_id).having(func.count() >= 2)

    streaks = [current_streak(p, now.date()) for p in (await db.scalars(select(Pet))).all()]
    return {
        "users": await count(select(User.id)),
        "new_users_24h": await count(select(User.id).where(User.created_at >= day_ago)),
        "active_users_today": await count(select(User.id).where(User.last_seen_at >= today_start)),
        "pets": len(streaks),
        "pairs": await count(owners_per_pet),
        "actions_24h": await count(select(PetAction.id).where(PetAction.performed_at >= day_ago)),
        "top_streak": max(streaks, default=0),
        "streaks": {name: sum(lo <= s <= hi for s in streaks) for name, lo, hi in STREAK_BUCKETS},
    }
