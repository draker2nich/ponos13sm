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
STATIC = Path(__file__).parent.parent / "static"
LANDING = STATIC / "landing.html"

# Mini-app static assets
if DIST.exists():
    if (DIST / "assets").exists():
        app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")
    if (DIST / "sprites").exists():
        app.mount("/sprites", StaticFiles(directory=DIST / "sprites"), name="sprites")


# Landing page на корне домена (для браузерного доступа)
@app.get("/")
async def landing_page():
    if LANDING.exists():
        return FileResponse(LANDING, media_type="text/html")
    # Fallback: если лендинга нет, показываем mini-app
    if DIST.exists() and (DIST / "index.html").exists():
        return FileResponse(DIST / "index.html")
    return {"message": "Pet Together API is running"}


# SPA fallback для mini-app роутов (всё кроме /api, /health, /assets, /sprites)
@app.get("/{full_path:path}")
async def spa_fallback(request: Request, full_path: str):
    # Не ловим API-пути
    if full_path.startswith(("pets", "invites", "health")):
        return {"detail": "Not found"}

    if DIST.exists() and (DIST / "index.html").exists():
        return FileResponse(DIST / "index.html")

    return {"detail": "Not found"}