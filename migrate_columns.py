import asyncio
from core.database import engine
from sqlalchemy import text

async def main():
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE pet_actions ADD COLUMN IF NOT EXISTS user_name VARCHAR(128)"))
        print("Done!")

asyncio.run(main())
