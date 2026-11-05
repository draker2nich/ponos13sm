from collections.abc import AsyncIterator
from typing import Any
from uuid import uuid4

from sqlalchemy.engine import URL, make_url
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from backend.config import settings

# libpq options that asyncpg does not understand
_LIBPQ_ONLY_PARAMS = ("sslmode", "channel_binding", "gssencmode", "options")


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


def create_engine() -> AsyncEngine:
    url, connect_args = asyncpg_url(settings.raw_db_url)
    if settings.is_serverless:
        # Each function instance is short-lived: don't keep idle connections around
        return create_async_engine(url, poolclass=NullPool, connect_args=connect_args)
    return create_async_engine(url, pool_size=5, max_overflow=10, pool_pre_ping=True, connect_args=connect_args)


engine = create_engine()
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session
