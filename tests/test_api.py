import pytest

from backend.game import STREAK_REWARDS
from tests.conftest import Client, init_data, make_pair


async def test_health(http):
    assert (await http.get("/api/health")).json() == {"status": "ok"}


@pytest.mark.parametrize("token", ["user=1&hash=forged", init_data(1, "A", age_seconds=2 * 86400)])
async def test_bad_or_expired_init_data_is_rejected(http, token):
    r = await http.get("/api/users/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401


async def test_create_pet_and_only_one_for_free_users(anna: Client, boris: Client):
    r = await anna.req("POST", "/pets", {"name": "Мурка", "pet_type": "cat"})
    assert r.status_code == 201
    pet = r.json()
    assert pet["owners"][0]["is_me"] and pet["owners"][0]["is_creator"]
    assert pet["recent"] == []

    assert (await anna.req("POST", "/pets", {"name": "Ещё"})).status_code == 403
    assert (await boris.req("GET", f"/pets/{pet['id']}")).status_code == 404


async def test_action_cooldown_and_coins(anna: Client):
    pid = (await anna.req("POST", "/pets", {"name": "Мурка"})).json()["id"]

    r = await anna.req("POST", f"/pets/{pid}/actions", {"action": "feed"})
    assert r.status_code == 200
    body = r.json()
    assert body["coins"] == 1 and body["streak_reward"] == 0
    assert body["pet"]["recent"][0]["action"] == "feed"
    assert body["pet"]["cooldowns"][0]["available_at"].endswith("+00:00")

    again = await anna.req("POST", f"/pets/{pid}/actions", {"action": "feed"})
    assert again.status_code == 429 and again.json()["detail"]["available_at"]

    assert (await anna.req("POST", f"/pets/{pid}/actions", {"action": "wash"})).status_code == 422


async def test_lazy_decay(anna: Client, sql):
    pid = (await anna.req("POST", "/pets", {"name": "Мурка"})).json()["id"]
    await sql("UPDATE pets SET decayed_at = decayed_at - interval '10 hours'")
    pet = (await anna.req("GET", f"/pets/{pid}")).json()
    assert round(pet["hunger"]) == 20 and round(pet["happiness"]) == 50 and round(pet["health"]) == 80


async def test_shop(anna: Client, sql):
    pid = (await anna.req("POST", "/pets", {"name": "Мурка"})).json()["id"]
    assert (await anna.req("POST", f"/pets/{pid}/buy", {"item_type": "food", "item_id": 0})).status_code == 402

    await sql("UPDATE users SET coins = 10")
    r = await anna.req("POST", f"/pets/{pid}/buy", {"item_type": "wash", "item_id": 0})
    assert r.status_code == 200 and r.json()["coins"] == 5 and r.json()["item_emoji"] == "🧴"
    assert (await anna.req("POST", f"/pets/{pid}/buy", {"item_type": "food", "item_id": 999})).status_code == 404


async def test_invites(anna: Client, boris: Client, http):
    pid = (await anna.req("POST", "/pets", {"name": "Мурка"})).json()["id"]
    token = (await anna.req("POST", "/invites", {"pet_id": pid})).json()["token"]

    assert (await anna.req("POST", f"/invites/{token}/accept")).status_code == 400
    assert (await boris.req("POST", f"/invites/{token}/accept")).json() == {"pet_id": pid}
    # Re-opening the same invite is harmless for the person who accepted it
    assert (await boris.req("POST", f"/invites/{token}/accept")).status_code == 200
    # A third owner is not allowed
    assert (await anna.req("POST", "/invites", {"pet_id": pid})).status_code == 409
    carol = Client(http, 3, "Кира")
    assert (await carol.req("POST", f"/invites/{token}/accept")).status_code == 400

    # Only the creator can delete
    assert (await boris.req("DELETE", f"/pets/{pid}")).status_code == 403
    assert (await anna.req("DELETE", f"/pets/{pid}")).status_code == 204


async def test_streak_and_milestone_reward(anna: Client, boris: Client, sql, telegram):
    pid = await make_pair(anna, boris)
    await anna.req("POST", f"/pets/{pid}/actions", {"action": "feed"})
    r = (await boris.req("POST", f"/pets/{pid}/actions", {"action": "feed"})).json()
    assert r["pet"]["streak"] == 1

    # Both were in yesterday with a streak one day short of a milestone
    milestone = 7
    await sql(
        "UPDATE pets SET streak = :s, last_streak_date = (now() at time zone 'utc') - interval '1 day'",
        s=milestone - 1,
    )
    await sql("UPDATE pet_ownerships SET last_active_at = (now() at time zone 'utc') - interval '1 day'")
    await sql("DELETE FROM action_cooldowns")
    await sql("UPDATE users SET coins = 0")
    first = (await anna.req("POST", f"/pets/{pid}/actions", {"action": "play"})).json()
    assert first["streak_reward"] == 0  # Boris hasn't been in today yet
    r = (await boris.req("POST", f"/pets/{pid}/actions", {"action": "play"})).json()

    reward = STREAK_REWARDS[milestone]
    assert r["pet"]["streak"] == milestone
    assert r["streak_reward"] == reward
    assert r["coins"] == 1 + reward
    assert (await anna.req("GET", "/users/me")).json()["coins"] == 1 + reward


async def test_partner_gets_notified_but_not_spammed(anna: Client, boris: Client, sql, telegram):
    pid = await make_pair(anna, boris)
    # Boris hasn't opened the app for a while
    await sql("UPDATE pet_ownerships SET last_active_at = last_active_at - interval '1 hour' WHERE user_id = 2")

    await anna.req("POST", f"/pets/{pid}/actions", {"action": "feed"})
    await anna.req("POST", f"/pets/{pid}/actions", {"action": "play"})

    messages = [m for m in telegram if type(m).__name__ == "SendMessage"]
    assert len(messages) == 1
    assert messages[0].chat_id == 2
    assert "Анна покормил(а)" in messages[0].text


async def test_partner_in_app_is_not_notified(anna: Client, boris: Client, telegram):
    pid = await make_pair(anna, boris)  # Boris just joined, so he's "in the app"
    await anna.req("POST", f"/pets/{pid}/actions", {"action": "feed"})
    assert not [m for m in telegram if type(m).__name__ == "SendMessage"]


async def test_game_coins_rate_limit_and_daily_cap(anna: Client, sql):
    r = (await anna.req("POST", "/users/me/coins", {"amount": 10, "game_score": 50})).json()
    assert r["accepted"] == 10 and r["game_best_score"] == 50
    assert (await anna.req("POST", "/users/me/coins", {"amount": 1})).status_code == 429
    assert (await anna.req("POST", "/users/me/coins", {"amount": 11})).status_code == 422

    await sql("UPDATE users SET game_coins_today = 58, last_coin_claim = NULL")
    r = (await anna.req("POST", "/users/me/coins", {"amount": 10})).json()
    assert r["accepted"] == 2 and r["left_today"] == 0

    # Yesterday's total doesn't count today
    await sql("UPDATE users SET game_coins_day = game_coins_day - 1, last_coin_claim = NULL")
    assert (await anna.req("POST", "/users/me/coins", {"amount": 5})).json()["accepted"] == 5


async def test_webhook(http, telegram):
    bad = await http.post("/api/telegram/webhook", json={}, headers={"X-Telegram-Bot-Api-Secret-Token": "nope"})
    assert bad.status_code == 403

    update = {
        "update_id": 1,
        "message": {
            "message_id": 1,
            "date": 0,
            "chat": {"id": 5, "type": "private"},
            "from": {"id": 5, "is_bot": False, "first_name": "Вера"},
            "text": "/start",
        },
    }
    ok = await http.post("/api/telegram/webhook", json=update, headers={"X-Telegram-Bot-Api-Secret-Token": "webhook-secret"})
    assert ok.status_code == 200
    assert "Вера" in telegram[0].text


async def test_webhook_survives_telegram_errors(http, monkeypatch):
    from aiogram.exceptions import TelegramForbiddenError

    async def blocked(self, bot, method, timeout=None):
        raise TelegramForbiddenError(method=method, message="bot was blocked by the user")

    monkeypatch.setattr("aiogram.client.session.aiohttp.AiohttpSession.make_request", blocked)
    update = {
        "update_id": 2,
        "message": {
            "message_id": 1,
            "date": 0,
            "chat": {"id": 6, "type": "private"},
            "from": {"id": 6, "is_bot": False, "first_name": "Ян"},
            "text": "/start",
        },
    }
    r = await http.post("/api/telegram/webhook", json=update, headers={"X-Telegram-Bot-Api-Secret-Token": "webhook-secret"})
    assert r.status_code == 200


async def test_cron_requires_secret(http, telegram):
    assert (await http.get("/api/cron/hunger")).status_code == 401
    r = await http.get("/api/cron/hunger", headers={"Authorization": "Bearer cron-secret"})
    assert r.json() == {"sent": 0}
