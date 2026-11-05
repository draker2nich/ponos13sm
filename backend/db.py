from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from backend.config import settings
from backend.dburl import asyncpg_url


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
