"""HTTP surface. Thin: it validates, delegates, and enforces idempotency.

Idempotency is here rather than in the pipeline because the failure it prevents
is a network-level one -- a phone retrying an upload it never saw acknowledged.
The client generates the key; the server makes replays free.
"""
from __future__ import annotations

from fastapi import FastAPI
from pydantic import BaseModel

from mealog import obs
from mealog.config import settings
from mealog.pipeline.runner import CONFIGS, make_vision, run

obs.configure(settings.log_level)
app = FastAPI(title="mealog", version="0.1.0")

#: TODO(Mon): Postgres-backed unique index on (user_id, idempotency_key).
#: In-memory is honest for day 0 and is called out in README "known limitations".
_SEEN: dict[str, dict] = {}


class LogMealRequest(BaseModel):
    idempotency_key: str
    sample_id: str
    locale: str = "en_US"
    text: str | None = None
    config: str = "V3"


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "vision": settings.vision_provider}


@app.post("/v1/meals")
def log_meal(req: LogMealRequest) -> dict:
    if cached := _SEEN.get(req.idempotency_key):
        obs.event("idempotent_replay", key=req.idempotency_key)
        return cached
    vision = make_vision(settings.vision_provider, settings.gemini_api_key)
    result = run(vision, req.sample_id, req.locale, CONFIGS[req.config],
                 req.idempotency_key, text=req.text).model_dump()
    _SEEN[req.idempotency_key] = result
    return result
