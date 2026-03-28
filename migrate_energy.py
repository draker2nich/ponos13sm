import asyncio
import traceback
from core.database import engine
from sqlalchemy import text

async def main():
    try:
        async with engine.begin() as conn:
            await conn.execute(text(
                "ALTER TABLE pets ADD COLUMN IF NOT EXISTS energy FLOAT DEFAULT 100.0"
            ))
            # Backfill existing pets
            await conn.execute(text(
                "UPDATE pets SET energy = 100.0 WHERE energy IS NULL"
            ))
            print("Column 'energy' added to pets table", flush=True)
        print("Done!", flush=True)
    except Exception as e:
        print(f"ERROR: {e}", flush=True)
        traceback.print_exc()

asyncio.run(main())