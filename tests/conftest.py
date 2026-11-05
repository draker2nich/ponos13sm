"""Tests run against a real Postgres (TEST_DATABASE_URL), migrated with Alembic.

    docker compose up -d
    TEST_DATABASE_URL=postgresql://postgres:secret@localhost:5432/pet_together_test pytest
"""

import hashlib
import hmac
import json
import os
import subprocess
import sys
import time
from urllib.parse import urlencode

import pytest

TEST_DB = os.environ.get("TEST_DATABASE_URL", "postgresql://postgres:secret@localhost:5432/pet_together_test")
os.environ.update(
    DATABASE_URL=TEST_DB,
    BOT_TOKEN="123456:test-token",
    BOT_USERNAME="test_bot",
    WEBHOOK_SECRET="webhook-secret",
    CRON_SECRET="cron-secret",
    MINI_APP_URL="https://example.test/app/",
    VERCEL="1",  # NullPool: every test gets its own event loop
)

import httpx  # noqa: E402
from sqlalchemy import text  # noqa: E402

from backend.db import engine  # noqa: E402
from backend.main import app  # noqa: E402

TABLES = "users, pets, pet_ownerships, pet_actions, action_cooldowns, invites"


@pytest.fixture(scope="session", autouse=True)
def migrated_db():
    subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], check=True, env=os.environ)


@pytest.fixture(autouse=True)
async def clean_db():
    async with engine.begin() as conn:
        await conn.execute(text(f"TRUNCATE {TABLES} RESTART IDENTITY CASCADE"))
    yield


@pytest.fixture
async def sql():
    async def run(query: str, **params):
        async with engine.begin() as conn:
            return await conn.execute(text(query), params)

    return run


def init_data(user_id: int, name: str, age_seconds: int = 0) -> str:
    fields = {
        "auth_date": str(int(time.time()) - age_seconds),
        "user": json.dumps({"id": user_id, "first_name": name}),
    }
    check = "\n".join(f"{k}={v}" for k, v in sorted(fields.items()))
    secret = hmac.new(b"WebAppData", os.environ["BOT_TOKEN"].encode(), hashlib.sha256).digest()
    fields["hash"] = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    return urlencode(fields)


class Client:
    """An API client signed in as one Telegram user."""

    def __init__(self, http: httpx.AsyncClient, user_id: int, name: str):
        self.http = http
        self.user_id = user_id
        self.headers = {"Authorization": f"Bearer {init_data(user_id, name)}"}

    async def req(self, method: str, path: str, json=None) -> httpx.Response:
        return await self.http.request(method, f"/api{path}", json=json, headers=self.headers)


@pytest.fixture
async def http():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        yield client


@pytest.fixture
def anna(http):
    return Client(http, 1, "Анна")


@pytest.fixture
def boris(http):
    return Client(http, 2, "Борис")


@pytest.fixture
def telegram(monkeypatch):
    """Captures every Bot API call instead of sending it."""
    sent = []

    async def fake_request(self, bot, method, timeout=None):
        sent.append(method)
        return True

    monkeypatch.setattr("aiogram.client.session.aiohttp.AiohttpSession.make_request", fake_request)
    return sent


async def make_pair(anna: Client, boris: Client) -> int:
    """Anna creates a pet and Boris joins it. Returns the pet id."""
    pet = (await anna.req("POST", "/pets", {"name": "Мурка", "pet_type": "cat"})).json()
    invite = (await anna.req("POST", "/invites", {"pet_id": pet["id"]})).json()
    assert (await boris.req("POST", f"/invites/{invite['token']}/accept")).status_code == 200
    return pet["id"]
