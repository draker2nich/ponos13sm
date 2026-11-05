from backend.dburl import DatabaseSettings


class Settings(DatabaseSettings):
    """App settings from the environment / .env (database fields come from DatabaseSettings)."""

    # Telegram
    bot_token: str
    bot_username: str
    # Shared secret Telegram sends in X-Telegram-Bot-Api-Secret-Token with every webhook call
    webhook_secret: str = ""
    # Max age of WebApp initData before we reject it
    init_data_ttl_seconds: int = 24 * 3600

    # Public URL of the mini app, e.g. https://tubric.tech/app
    mini_app_url: str = "http://localhost:5173/app/"

    # Vercel Cron sends "Authorization: Bearer $CRON_SECRET"
    cron_secret: str = ""

    # Set automatically on Vercel
    vercel: str = ""

    # Pet mechanics (per hour)
    hunger_decay_per_hour: float = 8.0
    happiness_decay_per_hour: float = 5.0
    health_decay_per_hour: float = 2.0
    sleep_decay_multiplier: float = 0.25

    feed_cooldown_hours: int = 4
    play_cooldown_hours: int = 4
    pet_cooldown_hours: int = 2

    invite_ttl_hours: int = 72

    @property
    def is_serverless(self) -> bool:
        return bool(self.vercel)

    def invite_link(self, token: str) -> str:
        return f"https://t.me/{self.bot_username}?start=inv_{token}"


settings = Settings()
