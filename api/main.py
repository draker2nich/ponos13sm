# api/main.py
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from core.config import settings
from core.database import init_db
from api.routers import pets, actions, invites


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="Pet Together API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=(
        ["*"] if settings.debug
        else [settings.mini_app_url]
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── API роутеры ──────────────────────────────────────────────────────────────
app.include_router(pets.router)
app.include_router(actions.router)
app.include_router(invites.router)


@app.get("/health")
async def health():
    return {"status": "ok"}


# ─── Статика и SPA ───────────────────────────────────────────────────────────
DIST = Path(__file__).parent.parent / "mini-app" / "dist"

if DIST.exists():
    # Монтируем /assets и /pets как статику
    if (DIST / "assets").exists():
        app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    if (DIST / "pets").exists():
        app.mount("/pets-files", StaticFiles(directory=DIST / "pets"), name="pets-files")

    # SPA fallback — отдаём index.html для всех остальных путей
    @app.get("/{full_path:path}")
    async def spa_fallback(request: Request, full_path: str):
        # Если запрос к /pets/... — отдаём файл напрямую
        if full_path.startswith("pets/"):
            file = DIST / full_path
            if file.exists():
                return FileResponse(file)
        return FileResponse(DIST / "index.html")