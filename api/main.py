# api/main.py
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.database import init_db
from api.routers import pets, actions, invites


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()  # локально; в проде убрать и использовать alembic
    yield


app = FastAPI(
    title="Pet Together API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # в проде заменить на домен Mini App
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