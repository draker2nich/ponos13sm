# api/auth.py
import hashlib
import hmac
import json
from urllib.parse import unquote, parse_qs

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.config import settings
from core.database import get_db
from models import User
from core.pet_logic import utcnow

bearer = HTTPBearer()


def _verify_init_data(init_data: str) -> dict:
    """
    Проверить подпись Telegram WebApp initData и вернуть распакованные данные.
    Бросает ValueError если подпись невалидна.
    """
    parsed = parse_qs(init_data, keep_blank_values=True)

    hash_val = parsed.pop("hash", [None])[0]
    if not hash_val:
        raise ValueError("hash missing")

    data_check = "\n".join(
        f"{k}={v[0]}" for k, v in sorted(parsed.items())
    )

    # ИСПРАВЛЕНО: hmac.new → hmac.new не существует, правильный вызов — hmac.new
    secret = hmac.new(
        b"WebAppData",
        settings.bot_token.encode(),
        hashlib.sha256,
    ).digest()

    expected = hmac.new(
        secret,
        data_check.encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, hash_val):
        raise ValueError("invalid hash")

    user_raw = parsed.get("user", [None])[0]
    if not user_raw:
        raise ValueError("user missing")

    return json.loads(unquote(user_raw))


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    # ИСПРАВЛЕНО: debug-режим только при явном локальном запуске
    if settings.debug and settings.db_host in ("localhost", "127.0.0.1", "postgres"):
        try:
            parsed = parse_qs(credentials.credentials)
            tg_user = json.loads(unquote(parsed.get("user", ["{}"])[0]))
        except Exception:
            tg_user = {}
        if not tg_user.get("id"):
            tg_user = {"id": 12345678, "first_name": "Dev", "username": "devuser"}
    else:
        try:
            tg_user = _verify_init_data(credentials.credentials)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid Telegram initData: {e}",
            )

    user_id = int(tg_user["id"])
    user = await db.scalar(select(User).where(User.id == user_id))

    if not user:
        user = User(
            id=user_id,
            username=tg_user.get("username"),
            first_name=tg_user.get("first_name"),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        user.last_seen_at = utcnow()
        await db.commit()

    return user