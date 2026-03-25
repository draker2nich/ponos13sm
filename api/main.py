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
    """
    Telegram WebApp открывает URL с параметрами pet_id, tgWebAppData и т.д.
    Также Telegram передаёт характерный referer или query-параметры.
    """
    params = set(request.query_params.keys())
    # Telegram WebApp всегда добавляет tgWebAppStartParam или pet_id
    tg_markers = {"tgWebAppStartParam", "tgWebAppData", "tgWebAppVersion",
                  "tgWebAppPlatform", "tgWebAppThemeParams", "pet_id", "action"}
    if params & tg_markers:
        return True
    # Fragment-based params не видны серверу, но если есть pet_id — это mini-app
    if request.query_params.get("pet_id"):
        return True
    return False


# ─── Роутинг: лендинг vs SPA ─────────────────────────────────────────────────

@app.get("/")
async def root(request: Request):
    # Если запрос от Telegram WebApp — отдаём SPA
    if _is_webapp_request(request):
        if DIST.exists() and (DIST / "index.html").exists():
            return FileResponse(DIST / "index.html")
    # Иначе — лендинг
    if LANDING.exists():
        return FileResponse(LANDING, media_type="text/html")
    # Fallback
    if DIST.exists() and (DIST / "index.html").exists():
        return FileResponse(DIST / "index.html")
    return {"message": "Pet Together API is running"}


@app.get("/{full_path:path}")
async def spa_fallback(request: Request, full_path: str):
    # API-пути не ловим
    if full_path.startswith(("pets", "invites", "health")):
        return {"detail": "Not found"}
    # Всё остальное — SPA (для клиентского роутинга mini-app)
    if DIST.exists() and (DIST / "index.html").exists():
        return FileResponse(DIST / "index.html")
    return {"detail": "Not found"}