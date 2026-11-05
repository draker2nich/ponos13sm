from functools import cached_property

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Telegram
    bot_token: str
    bot_username: str
    # Shared secret Telegram sends in X-Telegram-Bot-Api-Secret-Token with every webhook call
    webhook_secret: str = ""
    # Max age of WebApp initData before we reject it
    init_data_ttl_seconds: int = 24 * 3600

    # Public URL of the mini app, e.g. https://tubric.tech/app
    mini_app_url: str = "http://localhost:5173/app/"

    # Database. DATABASE_URL wins; the DB_* fields are a local-dev fallback.
    database_url: str = Field(default="", validation_alias=AliasChoices("DATABASE_URL", "POSTGRES_URL"))
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "pet_together"
    db_user: str = "postgres"
    db_password: str = ""

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

    @cached_property
    def raw_db_url(self) -> str:
        if self.database_url:
            return self.database_url
        return (
            f"postgresql://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )

    def invite_link(self, token: str) -> str:
        return f"https://t.me/{self.bot_username}?start=inv_{token}"


settings = Settings()
