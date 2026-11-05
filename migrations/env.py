import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from backend.dburl import DatabaseSettings, asyncpg_url
from backend.models import Base

if context.config.config_file_name:
    fileConfig(context.config.config_file_name)

target_metadata = Base.metadata
# Only the database is needed here, so migrations run without bot credentials (e.g. in the Vercel build)
DB_URL = DatabaseSettings().raw_db_url


def run_offline() -> None:
    url, _ = asyncpg_url(DB_URL)
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def _run(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_online() -> None:
    url, connect_args = asyncpg_url(DB_URL)
    engine = create_async_engine(url, poolclass=NullPool, connect_args=connect_args)
    async with engine.connect() as connection:
        await connection.run_sync(_run)
    await engine.dispose()


if context.is_offline_mode():
    run_offline()
else:
    asyncio.run(run_online())
