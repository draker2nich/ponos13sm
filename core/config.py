from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Telegram
    bot_token: str
    bot_username: str  # без @, нужен для генерации инвайт-ссылок

    # Database
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "pet_together"
    db_user: str = "postgres"
    db_password: str

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    secret_key: str
    debug: bool = False

    # Mini App
    mini_app_url: str = "http://localhost:5173"

    # Pet mechanics
    hunger_decay_per_hour: float = 8.0    # -8 hunger каждый час
    happiness_decay_per_hour: float = 5.0
    health_decay_per_hour: float = 2.0

    feed_cooldown_hours: int = 4
    play_cooldown_hours: int = 4
    pet_cooldown_hours: int = 2

    feed_hunger_restore: float = 30.0
    play_happiness_restore: float = 25.0
    pet_happiness_restore: float = 15.0
    pet_health_restore: float = 10.0

    invite_ttl_hours: int = 72

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def db_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )

    @property
    def invite_link(self) -> str:
        return f"https://t.me/{self.bot_username}?start=inv_"


settings = Settings()   