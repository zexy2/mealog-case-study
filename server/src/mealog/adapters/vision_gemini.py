"""Live Gemini vision adapter.

The adapter owns only provider I/O and response validation. It returns observed
items, never catalogue IDs or nutrient values. The evaluation harness can turn
that validated response into an offline fixture without storing the input image
or the API response envelope.
"""
from __future__ import annotations

import base64
import json
import os
import time
from collections.abc import Callable
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from pydantic import ValidationError

from mealog.domain.models import PerceivedItem
from mealog.pipeline.ports import VisionInput

PROMPT_VERSION = "p2"
DEFAULT_MODEL = "gemini-flash-lite-latest"
MODEL_ENV_VAR = "GEMINI_MODEL"
REQUEST_INTERVAL_SECONDS = 4.0
MAX_429_RETRIES = 4
MAX_BACKOFF_SECONDS = 60.0
API_ROOT = "https://generativelanguage.googleapis.com/v1beta"
MAX_ERROR_BODY = 500

SYSTEM_PROMPT = """You list what food is visible in the supplied image or text.
Return observed items only. You do NOT estimate calories, macros, nutrients, or
grams. The downstream catalogue and nutrition stages handle those values.

Rules:
- Name dishes in the language on the plate's origin if you recognise it.
- If unsure between two dishes, return the more general one and lower confidence.
- Never invent an item you cannot see. Omission is cheaper than invention.
- `portion_hint` may describe a visible serving or user-provided text, but is not
  a numeric gram estimate.
"""

RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "items": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "surface_form": {
                        "type": "STRING",
                        "description": "The visible dish or food name.",
                    },
                    "cooking_method": {
                        "type": "STRING",
                        "description": "Visible or explicitly stated cooking method.",
                    },
                    "portion_hint": {
                        "type": "STRING",
                        "description": "Non-numeric serving description, if visible or stated.",
                    },
                    "confidence": {
                        "type": "NUMBER",
                        "minimum": 0,
                        "maximum": 1,
                        "description": "Confidence that this item is present, from 0 to 1.",
                    },
                },
                "required": [
                    "surface_form",
                    "cooking_method",
                    "portion_hint",
                    "confidence",
                ],
            },
        }
    },
    "required": ["items"],
}

_FORBIDDEN_NUTRIENT_FIELDS = {
    "kcal",
    "calories",
    "carb_g",
    "fat_g",
    "food_id",
    "grams",
    "nutrients",
    "protein_g",
    "ungrounded_kcal",
}
_ALLOWED_ITEM_FIELDS = frozenset(RESPONSE_SCHEMA["properties"]["items"]["items"]["properties"])
_IMAGE_MIME_FALLBACKS = {
    ".avif": "image/avif",
    ".gif": "image/gif",
    ".heic": "image/heic",
    ".heif": "image/heif",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}
_ALLOWED_IMAGE_MIME_TYPES = frozenset(_IMAGE_MIME_FALLBACKS.values()) | {"image/jpg"}


def configured_model_id() -> str:
    """Read the live model from environment-backed application config."""
    return os.getenv(MODEL_ENV_VAR, DEFAULT_MODEL).strip() or DEFAULT_MODEL


def _image_part(input_ref: VisionInput) -> dict[str, Any]:
    if input_ref.image_bytes is None or not input_ref.image_media_type:
        raise ValueError("Gemini image input needs bytes and a MIME type")
    mime_type = input_ref.image_media_type.lower()
    if mime_type not in _ALLOWED_IMAGE_MIME_TYPES:
        raise ValueError(f"unsupported Gemini image MIME type '{mime_type}'")
    if len(input_ref.image_bytes) > 10 * 1024 * 1024:
        raise ValueError("Gemini image exceeds 10 MiB limit")

    return {
        "inlineData": {
            "mimeType": mime_type,
            "data": base64.b64encode(input_ref.image_bytes).decode("ascii"),
        }
    }


def _response_text(response: dict[str, Any]) -> str:
    candidates = response.get("candidates")
    if not isinstance(candidates, list) or not candidates:
        reason = response.get("promptFeedback") or response.get("error") or "no candidates"
        raise RuntimeError(f"Gemini returned no candidate: {reason}")

    candidate = candidates[0]
    if not isinstance(candidate, dict):
        raise TypeError("Gemini returned an invalid candidate")
    parts = candidate.get("content", {}).get("parts", [])
    text = "".join(part.get("text", "") for part in parts if isinstance(part, dict))
    if not text:
        reason = candidate.get("finishReason", "empty response")
        raise RuntimeError(f"Gemini returned no text candidate: {reason}")
    return text


def _parse_items(text: str) -> list[PerceivedItem]:
    try:
        document = json.loads(text)
    except json.JSONDecodeError as exc:
        raise RuntimeError("Gemini returned non-JSON text despite JSON schema mode") from exc

    if not isinstance(document, dict) or not isinstance(document.get("items"), list):
        raise TypeError("Gemini JSON response must contain an items array")

    parsed: list[PerceivedItem] = []
    for index, raw in enumerate(document["items"]):
        if not isinstance(raw, dict):
            raise TypeError(f"Gemini item {index} is not an object")
        forbidden = _FORBIDDEN_NUTRIENT_FIELDS.intersection(raw)
        if forbidden:
            fields = ", ".join(sorted(forbidden))
            raise RuntimeError(f"Gemini item {index} contains forbidden nutrient field(s): {fields}")
        unknown = set(raw) - _ALLOWED_ITEM_FIELDS
        if unknown:
            fields = ", ".join(sorted(unknown))
            raise RuntimeError(f"Gemini item {index} contains unknown field(s): {fields}")
        try:
            item = PerceivedItem.model_validate(raw)
        except ValidationError as exc:
            raise RuntimeError(f"Gemini item {index} failed response validation") from exc
        if not item.surface_form.strip():
            raise RuntimeError(f"Gemini item {index} has an empty surface_form")
        if not 0 <= item.confidence <= 1:
            raise RuntimeError(f"Gemini item {index} confidence is outside [0, 1]")
        parsed.append(item)
    return parsed


class GeminiVision:
    name = "gemini"

    def __init__(
        self,
        api_key: str,
        model: str | None = None,
        timeout: float = 90.0,
        opener: Callable[..., Any] = urlopen,
        request_interval: float = REQUEST_INTERVAL_SECONDS,
        max_429_retries: int = MAX_429_RETRIES,
        retry_backoff_base: float = REQUEST_INTERVAL_SECONDS,
        model_id: str | None = None,
    ):
        if not api_key.strip():
            raise ValueError("GEMINI_API_KEY is required for the live vision provider")
        self.api_key = api_key
        self.model_id = model_id or model or configured_model_id()
        self.model = self.model_id  # compatibility for existing callers
        self.timeout = timeout
        self._opener = opener
        self.request_interval = max(0.0, request_interval)
        self.max_429_retries = max(0, max_429_retries)
        self.retry_backoff_base = max(0.0, retry_backoff_base)
        self._last_request_started: float | None = None
        self.request_count = 0
        self.last_items: list[PerceivedItem] | None = None
        self.last_input: VisionInput | None = None

    def _wait_for_request_slot(self) -> None:
        now = time.monotonic()
        if self._last_request_started is not None:
            remaining = self.request_interval - (now - self._last_request_started)
            if remaining > 0:
                time.sleep(remaining)
        self._last_request_started = time.monotonic()

    @staticmethod
    def _retry_after(exc: HTTPError) -> float | None:
        value = exc.headers.get("Retry-After") if exc.headers else None
        if value is None:
            return None
        try:
            return max(0.0, float(value))
        except ValueError:
            return None

    def _backoff_delay(self, exc: HTTPError, attempt: int) -> float:
        retry_after = self._retry_after(exc)
        if retry_after is not None:
            return retry_after
        return min(MAX_BACKOFF_SECONDS, self.retry_backoff_base * (2**attempt))

    def _request(self, parts: list[dict[str, Any]]) -> dict[str, Any]:
        payload = {
            "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
            "contents": [{"role": "user", "parts": parts}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseSchema": RESPONSE_SCHEMA,
            },
        }
        url = f"{API_ROOT}/models/{quote(self.model_id, safe='')}:generateContent"
        request = Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": self.api_key,
            },
            method="POST",
        )
        for attempt in range(self.max_429_retries + 1):
            self._wait_for_request_slot()
            self.request_count += 1
            try:
                with self._opener(request, timeout=self.timeout) as response:
                    return json.loads(response.read())
            except HTTPError as exc:
                detail = exc.read().decode("utf-8", errors="replace")[:MAX_ERROR_BODY]
                if exc.code != 429:
                    raise RuntimeError(
                        f"Gemini request failed with HTTP {exc.code}: {detail}"
                    ) from exc
                if attempt >= self.max_429_retries:
                    raise RuntimeError(
                        f"Gemini request exhausted 429 retries after {self.request_count} "
                        f"attempts: {detail}"
                    ) from exc
                time.sleep(self._backoff_delay(exc, attempt))
            except URLError as exc:
                raise RuntimeError(f"Gemini request failed: {exc.reason}") from exc
            except json.JSONDecodeError as exc:
                raise RuntimeError("Gemini returned an invalid JSON envelope") from exc
        raise RuntimeError("Gemini request loop ended without a response")

    def perceive(self, input_ref: VisionInput) -> list[PerceivedItem]:
        """Call Gemini with image bytes or explicit text, never a fixture ID."""
        parts: list[dict[str, Any]] = []
        if input_ref.image_bytes is not None:
            parts.append(_image_part(input_ref))
        elif not input_ref.text or not input_ref.text.strip():
            raise FileNotFoundError(
                "live Gemini provider requires image bytes or explicit text; sample_id is fixture-only"
            )

        if input_ref.text and input_ref.text.strip():
            parts.append({"text": input_ref.text.strip()})
        parts.append({"text": "List only the visible food items using the required JSON schema."})
        self.last_input = input_ref
        self.last_items = _parse_items(_response_text(self._request(parts)))
        return self.last_items

    def fixture_payload(self, input_ref: VisionInput, items: list[PerceivedItem]) -> dict[str, Any]:
        """Return safe, deterministic fixture data from a validated response."""
        if not input_ref.fixture_key:
            raise ValueError("fixture recording needs an image hash or sample_id")
        return {
            "_synthetic": False,
            "sample_id": input_ref.sample_id,
            "input_sha256": input_ref.content_hash,
            "provider": self.name,
            "model_id": self.model_id,
            "prompt_version": PROMPT_VERSION,
            "items": [item.model_dump(exclude_none=True) for item in items],
        }

    def record_fixture(
        self, directory: Path, input_ref: VisionInput, path: Path | None = None
    ) -> Path:
        """Persist last validated observations without the image or envelope."""
        if self.last_items is None or self.last_input != input_ref:
            raise ValueError("record_fixture must follow a successful perceive call")
        key = input_ref.fixture_key
        if not key:
            raise ValueError("fixture recording needs an image hash or sample_id")
        directory.mkdir(parents=True, exist_ok=True)
        path = path or directory / f"{key}.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_suffix(".json.tmp")
        temporary.write_text(
            json.dumps(self.fixture_payload(input_ref, self.last_items), indent=2, ensure_ascii=False)
            + "\n",
            encoding="utf-8",
        )
        temporary.replace(path)
        return path
