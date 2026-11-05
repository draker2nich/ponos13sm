"""Telegram WebApp auth: the client sends `Authorization: Bearer <initData>`."""

import hashlib
import hmac
import json
import logging
import time
from urllib.parse import parse_qsl

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.db import get_db
from backend.models import User, utcnow

log = logging.getLogger(__name__)
bearer = HTTPBearer()


class InvalidInitData(ValueError):
    pass


def verify_init_data(init_data: str, bot_token: str, max_age: int | None = None) -> dict:
    """Check the initData signature and return the Telegram user.

    https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
    """
    fields = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = fields.pop("hash", None)
    if not received_hash:
        raise InvalidInitData("hash missing")

    check_string = "\n".join(f"{k}={v}" for k, v in sorted(fields.items()))
    secret = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    expected = hmac.new(secret, check_string.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, received_hash):
        raise InvalidInitData("invalid hash")

    if max_age:
        auth_date = int(fields.get("auth_date", 0))
        if time.time() - auth_date > max_age:
            raise InvalidInitData("initData expired")

    if "user" not in fields:
        raise InvalidInitData("user missing")
    return json.loads(fields["user"])


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        tg_user = verify_init_data(credentials.credentials, settings.bot_token, settings.init_data_ttl_seconds)
    except (InvalidInitData, ValueError) as e:
        log.warning("initData rejected: %s", e)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid Telegram initData") from e

    user = await db.get(User, int(tg_user["id"]))
    if user is None:
        user = User(id=int(tg_user["id"]), coins=0, game_best_score=0)
        db.add(user)
    user.username = tg_user.get("username")
    user.first_name = tg_user.get("first_name")
    user.last_seen_at = utcnow()
    await db.commit()
    return user
