# api/main.py
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from core.config import settings
from core.database import init_db
from api.routers import pets, actions, invites, users


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
app.include_router(users.router)


@app.get("/health")
async def health():
    return {"status": "ok"}


# ─── Статика ──────────────────────────────────────────────────────────────────
DIST = Path(__file__).parent.parent / "mini-app" / "dist"
STATIC = Path(__file__).parent.parent / "static"
LANDING = STATIC / "landing.html"

if DIST.exists():
    if (DIST / "assets").exists():
        app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")
    if (DIST / "sprites").exists():
        app.mount("/sprites", StaticFiles(directory=DIST / "sprites"), name="sprites")


# ─── Определяем: это Telegram WebApp или обычный браузер ──────────────────────

def _is_webapp_request(request: Request) -> bool:
    params = set(request.query_params.keys())
    tg_markers = {"tgWebAppStartParam", "tgWebAppData", "tgWebAppVersion",
                  "tgWebAppPlatform", "tgWebAppThemeParams", "pet_id", "action"}
    if params & tg_markers:
        return True
    if request.query_params.get("pet_id"):
        return True
    return False


# ─── Роутинг: лендинг vs SPA ─────────────────────────────────────────────────

@app.get("/")
async def root(request: Request):
    if _is_webapp_request(request):
        if DIST.exists() and (DIST / "index.html").exists():
            return FileResponse(DIST / "index.html")
    if LANDING.exists():
        return FileResponse(LANDING, media_type="text/html")
    if DIST.exists() and (DIST / "index.html").exists():
        return FileResponse(DIST / "index.html")
    return {"message": "Pet Together API is running"}


@app.get("/{full_path:path}")
async def spa_fallback(request: Request, full_path: str):
    if full_path.startswith(("pets", "invites", "users", "health")):
        return {"detail": "Not found"}
    if DIST.exists() and (DIST / "index.html").exists():
        return FileResponse(DIST / "index.html")
    return {"detail": "Not found"}