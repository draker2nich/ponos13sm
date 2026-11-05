#!/usr/bin/env bash
# Vercel build command (see vercel.json).
# Production deploys migrate the database first: if the migration fails the build fails,
# and the previous deployment keeps serving traffic.
set -euo pipefail

if [ "${VERCEL_ENV:-}" = "production" ]; then
  echo "Applying database migrations"
  python3 -m pip install --quiet --user uv
  export PATH="$HOME/.local/bin:$PATH"
  uv run --no-project --python 3.12 \
    --with "alembic==1.14.0" --with "sqlalchemy[asyncio]==2.0.36" \
    --with "asyncpg==0.30.0" --with "pydantic-settings==2.7.1" \
    python -m alembic upgrade head
fi

npm run build --prefix mini-app
