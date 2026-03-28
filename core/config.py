import re
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Telegram
    bot_token: str
    bot_username: str

    # Database — локально используем отдельные поля, на Heroku придёт DATABASE_URL
    database_url: str = ""
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "pet_together"
    db_user: str = "postgres"
    db_password: str = ""

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    secret_key: str
    debug: bool = False

    # Mini App
    mini_app_url: str = "http://localhost:5173"

    # Pet mechanics — decay per hour
    hunger_decay_per_hour: float = 8.0
    happiness_decay_per_hour: float = 5.0
    health_decay_per_hour: float = 2.0
    energy_decay_per_hour: float = 3.0          # passive energy drain
    energy_regen_sleep_per_hour: float = 25.0   # energy restored while sleeping per hour

    # Cooldowns (still used for free pet/glove action)
    feed_cooldown_hours: int = 4
    play_cooldown_hours: int = 4
    pet_cooldown_hours: int = 2

    # Free action deltas (only PET/glove is truly free now)
    feed_hunger_restore: float = 30.0
    play_happiness_restore: float = 25.0
    pet_happiness_restore: float = 15.0
    pet_health_restore: float = 10.0

    # Game energy
    game_energy_cost: float = 8.0        # energy spent per game session
    game_min_energy: float = 15.0        # can't start game below this

    invite_ttl_hours: int = 72

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def db_url(self) -> str:
        if self.database_url:
            return re.sub(r"^postgres://", "postgresql+asyncpg://", self.database_url)
        return (
            f"postgresql+asyncpg://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )

    @property
    def invite_link(self) -> str:
        return f"https://t.me/{self.bot_username}?start=inv_"


settings = Settings()