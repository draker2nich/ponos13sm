"""Database URL handling. Kept free of bot settings so migrations only need DATABASE_URL."""

from functools import cached_property
from typing import Any
from uuid import uuid4

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL, make_url

# libpq options that asyncpg does not understand
_LIBPQ_ONLY_PARAMS = ("sslmode", "channel_binding", "gssencmode", "options")


class DatabaseSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # DATABASE_URL wins; the DB_* fields are a local-dev fallback
    database_url: str = Field(default="", validation_alias=AliasChoices("DATABASE_URL", "POSTGRES_URL"))
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "pet_together"
    db_user: str = "postgres"
    db_password: str = ""

    @cached_property
    def raw_db_url(self) -> str:
        if self.database_url:
            return self.database_url
        return f"postgresql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"


def asyncpg_url(raw: str) -> tuple[URL, dict[str, Any]]:
    """Turn any postgres:// URL (Heroku, Neon, Supabase, local) into an asyncpg URL + connect args."""
    url = make_url(raw).set(drivername="postgresql+asyncpg")
    query = dict(url.query)
    connect_args: dict[str, Any] = {
        # Safe behind PgBouncer / Neon pooler in transaction mode
        "statement_cache_size": 0,
        "prepared_statement_name_func": lambda: f"__asyncpg_{uuid4()}__",
    }

    sslmode = query.get("sslmode")
    if sslmode and sslmode != "disable":
        connect_args["ssl"] = "require"
    for key in _LIBPQ_ONLY_PARAMS:
        query.pop(key, None)

    return url.set(query=query), connect_args
