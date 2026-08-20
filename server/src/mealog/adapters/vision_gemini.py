"""Live Gemini vision adapter.

The adapter owns only provider I/O and response validation. It returns observed
items, never catalogue IDs or nutrient values. The evaluation harness can turn
that validated response into an offline fixture without storing the input image
or the API response envelope.
"""
from __future__ import annotations

import base64
import json
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
DEFAULT_MODEL = "gemini-2.5-flash"
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
        model: str = DEFAULT_MODEL,
        timeout: float = 90.0,
        opener: Callable[..., Any] = urlopen,
    ):
        if not api_key.strip():
            raise ValueError("GEMINI_API_KEY is required for the live vision provider")
        self.api_key = api_key
        self.model = model
        self.timeout = timeout
        self._opener = opener
        self.last_items: list[PerceivedItem] | None = None
        self.last_input: VisionInput | None = None

    def _request(self, parts: list[dict[str, Any]]) -> dict[str, Any]:
        payload = {
            "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
            "contents": [{"role": "user", "parts": parts}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseSchema": RESPONSE_SCHEMA,
            },
        }
        url = f"{API_ROOT}/models/{quote(self.model, safe='')}:generateContent"
        request = Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": self.api_key,
            },
            method="POST",
        )
        try:
            with self._opener(request, timeout=self.timeout) as response:
                return json.loads(response.read())
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")[:MAX_ERROR_BODY]
            raise RuntimeError(f"Gemini request failed with HTTP {exc.code}: {detail}") from exc
        except URLError as exc:
            raise RuntimeError(f"Gemini request failed: {exc.reason}") from exc
        except json.JSONDecodeError as exc:
            raise RuntimeError("Gemini returned an invalid JSON envelope") from exc

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
            "model": self.model,
            "prompt_version": PROMPT_VERSION,
            "items": [item.model_dump(exclude_none=True) for item in items],
        }

    def record_fixture(self, directory: Path, input_ref: VisionInput) -> Path:
        """Persist last validated observations without the image or envelope."""
        if self.last_items is None or self.last_input != input_ref:
            raise ValueError("record_fixture must follow a successful perceive call")
        key = input_ref.fixture_key
        if not key:
            raise ValueError("fixture recording needs an image hash or sample_id")
        directory.mkdir(parents=True, exist_ok=True)
        path = directory / f"{key}.json"
        temporary = path.with_suffix(".json.tmp")
        temporary.write_text(
            json.dumps(self.fixture_payload(input_ref, self.last_items), indent=2, ensure_ascii=False)
            + "\n",
            encoding="utf-8",
        )
        temporary.replace(path)
        return path
