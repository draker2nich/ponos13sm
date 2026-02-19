# api/main.py
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.database import init_db
from api.routers import pets, actions, invites


@asynccontextmanager
async def lifespan(app: FastAPI):
    # init_db безопасен — использует CREATE TABLE IF NOT EXISTS
    # После настройки Alembic заменить на: if settings.debug: await init_db()
    await init_db()
    yield


app = FastAPI(
    title="Pet Together API",
    version="0.1.0",
    lifespan=lifespan,
)

# ИСПРАВЛЕНО: конкретный origin вместо "*" + credentials
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