# Pet Together

Deployment guide (Vercel, Neon, tubric.tech, webhook): [DEPLOY.md](DEPLOY.md).

A virtual pet in Telegram that two friends raise together: feed it, play with it, stroke it
and keep a shared daily streak.

- **Mini app** (`mini-app/`): React + Vite, served at `/app/`
- **Landing page** (`public/index.html`), served at `/`
- **API + bot** (`backend/`): FastAPI and aiogram, one serverless function at `/api/*`
- **Database**: Postgres (Neon on Vercel), migrations with Alembic

```
api/index.py          Vercel entry point, imports backend.main:app
backend/
  main.py             FastAPI app, all routes under /api
  config.py           settings from environment / .env
  db.py               async engine (NullPool on Vercel)
  models.py           SQLAlchemy models
  game.py             pet rules: decay, mood, actions, shop, streak
  auth.py             Telegram initData verification
  routers/            pets, actions, shop, invites, users, telegram (webhook), cron
  bot/                handlers, keyboards, reminders; `python -m backend.bot` = local polling
migrations/           Alembic
mini-app/             frontend, builds into public/app
public/               landing page + build output
vercel.json           build, rewrites, cron schedules
```

## How it runs on Vercel

- Static files (`public/`) are served from the CDN.
- Every `/api/*` request is rewritten to `api/index.py`.
- The bot uses a **webhook**: Telegram posts updates to `/api/telegram/webhook`.
- Stats decay **lazily**: each time a pet is loaded, the time since `pets.decayed_at` is applied.
  No background worker is needed.
- Reminders run from **Vercel Cron** (`vercel.json`): hunger at 09:00 UTC, streak at 16:00 UTC.
  The Hobby plan allows one run per day per job, with ±59 min precision.

## Environment variables

| Name | What |
| --- | --- |
| `BOT_TOKEN` | Token from @BotFather |
| `BOT_USERNAME` | Bot username without `@` |
| `WEBHOOK_SECRET` | Random string, checked on every webhook call |
| `CRON_SECRET` | Random string, Vercel Cron sends it as a Bearer token |
| `MINI_APP_URL` | `https://tubric.tech/app/` |
| `DATABASE_URL` | Postgres URL; added automatically by the Neon integration |

## Local development

```bash
cp .env.example .env              # fill in BOT_TOKEN etc.
docker compose up -d              # Postgres on :5432

python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
alembic upgrade head
uvicorn backend.main:app --reload --port 8000

cd mini-app && npm install && npm run dev   # http://localhost:5173/app/, proxies /api to :8000
python -m backend.bot                        # bot via long polling (removes the webhook!)
```

Telegram opens mini apps only over HTTPS. To try it inside Telegram, run a tunnel
(`cloudflared tunnel --url http://localhost:5173`) and set `MINI_APP_URL` to the tunnel URL plus `/app/`.

After testing the bot locally, set the webhook again (see deployment guide), otherwise the
production bot stays silent.

## Stats

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://tubric.tech/api/admin/stats
```

Users, new and active users, pets, pairs, actions in the last 24 hours and the streak distribution.

## Tests

```bash
docker compose up -d
TEST_DATABASE_URL=postgresql://postgres:secret@localhost:5432/postgres pytest
```

GitHub Actions runs the same tests and the frontend build on every push (`.github/workflows/ci.yml`).

## Migrations

Production deploys apply migrations automatically: `scripts/vercel-build.sh` runs `alembic upgrade head`
before building the frontend when `VERCEL_ENV=production`. If a migration fails, the build fails and the
previous deployment stays live. Migrations should stay additive (new nullable columns or with defaults), so
the code that is still live keeps working while the new build is in progress.

By hand:

```bash
alembic upgrade head                           # new database
alembic stamp 0001 && alembic upgrade head     # database created by the old create_all code
alembic revision --autogenerate -m "..."       # after changing models.py
```
