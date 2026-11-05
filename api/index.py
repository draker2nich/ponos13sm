# Vercel entry point: every /api/* request is rewritten here (see vercel.json)
from backend.main import app

__all__ = ["app"]
