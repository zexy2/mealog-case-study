"""HTTP surface. Thin: it validates, delegates, and enforces idempotency.

Idempotency is here rather than in the pipeline because the failure it prevents
is a network-level one -- a phone retrying an upload it never saw acknowledged.
The client generates the key; the server makes replays free.
"""
from __future__ import annotations

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from starlette.datastructures import UploadFile

from mealog import obs
from mealog.config import settings
from mealog.pipeline.ports import VisionInput
from mealog.pipeline.runner import CONFIGS, make_vision, run

settings = settings.validated()
obs.configure(settings.log_level)
app = FastAPI(title="mealog", version="0.1.0")

#: TODO(Mon): Postgres-backed unique index on idempotency_key.
#: In-memory is honest for day 0 and is called out in README "known limitations".
_SEEN: dict[str, dict] = {}
MAX_IMAGE_BYTES = 10 * 1024 * 1024
ALLOWED_IMAGE_TYPES = frozenset(
    {
        "image/avif",
        "image/gif",
        "image/heic",
        "image/heif",
        "image/jpg",
        "image/jpeg",
        "image/png",
        "image/webp",
    }
)


class LogMealRequest(BaseModel):
    idempotency_key: str
    sample_id: str | None = None
    locale: str = "en_US"
    text: str | None = None
    config: str = "V3"


def _config_for(name: str):
    config = CONFIGS.get(name)
    if config is None:
        choices = ", ".join(sorted(CONFIGS))
        raise HTTPException(
            status_code=422,
            detail=f"unknown config '{name}'; expected one of: {choices}",
        )
    return config


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "vision": settings.vision_provider}


async def _parse_request(request: Request) -> tuple[LogMealRequest, VisionInput]:
    content_type = request.headers.get("content-type", "")
    if content_type.startswith("multipart/form-data"):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_IMAGE_BYTES + 2 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="multipart request is too large")
        form = await request.form()
        values = {
            name: form.get(name)
            for name in ("idempotency_key", "sample_id", "locale", "text", "config")
            if form.get(name) is not None
        }
        try:
            req = LogMealRequest.model_validate(values)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail="invalid meal form fields") from exc

        upload = form.get("image")
        if upload is None:
            try:
                return req, VisionInput(sample_id=req.sample_id, text=req.text)
            except ValueError as exc:
                raise HTTPException(
                    status_code=422, detail="multipart request needs image, text, or sample_id"
                ) from exc
        if not isinstance(upload, UploadFile):
            raise HTTPException(status_code=422, detail="image must be a file upload")
        media_type = (upload.content_type or "").lower()
        if media_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(status_code=415, detail="unsupported image content type")
        image_bytes = await upload.read(MAX_IMAGE_BYTES + 1)
        if len(image_bytes) > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=413, detail="image exceeds 10 MiB limit")
        return req, VisionInput(
            image_bytes=image_bytes,
            image_media_type=media_type,
            text=req.text,
            sample_id=req.sample_id,
        )

    try:
        req = LogMealRequest.model_validate(await request.json())
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="invalid JSON request") from exc
    try:
        return req, VisionInput(sample_id=req.sample_id, text=req.text)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="request needs image, text, or sample_id") from exc


@app.post("/v1/meals")
async def log_meal(request: Request) -> dict:
    req, input_ref = await _parse_request(request)
    config = _config_for(req.config)
    if req.idempotency_key in _SEEN:
        cached = _SEEN[req.idempotency_key]
        obs.event("idempotent_replay", key=req.idempotency_key)
        return cached
    if settings.vision_provider != "fixture" and input_ref.sample_id:
        raise HTTPException(
            status_code=400,
            detail="sample_id is test-only; live provider needs image or text input",
        )
    vision = make_vision(settings.vision_provider, settings.gemini_api_key)
    result = run(vision, input_ref, req.locale, config, req.idempotency_key).model_dump()
    _SEEN[req.idempotency_key] = result
    return result
