# migrate_once.py — одноразовый скрипт, удалить после применения
import asyncio
from sqlalchemy import text
from core.database import engine


async def migrate():
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 0"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS game_best_score INTEGER DEFAULT 0"))
        await conn.execute(text("ALTER TABLE pets ADD COLUMN IF NOT EXISTS is_sleeping BOOLEAN DEFAULT FALSE"))
    await engine.dispose()
    print("Migration done!")


if __name__ == "__main__":
    asyncio.run(migrate())