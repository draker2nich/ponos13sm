import asyncio
import traceback
from core.database import engine
from sqlalchemy import text

async def main():
    try:
        async with engine.begin() as conn:
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_coin_claim TIMESTAMP"))
            print("Column added", flush=True)
        # ALTER TYPE ... ADD VALUE нельзя внутри транзакции в PostgreSQL
        # Нужен autocommit
        async with engine.connect() as conn:
            await conn.execute(text("COMMIT"))
            await conn.execute(text("ALTER TYPE actiontype ADD VALUE IF NOT EXISTS 'WASH'"))
            print("Enum updated", flush=True)
        print("Done!", flush=True)
    except Exception as e:
        print(f"ERROR: {e}", flush=True)
        traceback.print_exc()

asyncio.run(main())