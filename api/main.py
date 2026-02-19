# api/main.py
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
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

app.include_router(pets.router)
app.include_router(actions.router)
app.include_router(invites.router)


@app.get("/health")
async def health():
    return {"status": "ok"}


# ─── Раздача собранного React фронта ─────────────────────────────────────────
DIST = Path(__file__).parent.parent / "mini-app" / "dist"
# На Heroku путь тот же — mini-app/dist создаётся buildpack'ом

if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        return FileResponse(DIST / "index.html")