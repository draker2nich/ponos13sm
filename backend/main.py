from fastapi import APIRouter, FastAPI

from backend.routers import actions, cron, invites, pets, shop, telegram, users

app = FastAPI(title="Pet Together API", docs_url="/api/docs", openapi_url="/api/openapi.json")

api = APIRouter(prefix="/api")
for module in (pets, actions, shop, invites, users, telegram, cron):
    api.include_router(module.router)


@api.get("/health", tags=["meta"])
async def health():
    return {"status": "ok"}


app.include_router(api)
