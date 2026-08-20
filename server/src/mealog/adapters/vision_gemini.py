"""Live provider adapter.

Kept thin on purpose: it turns an image into observed items and nothing else.
It is never allowed to return nutrients, so swapping providers cannot change
the calorie numbers -- only which foods get proposed.

TODO(Fri): real client call + JSON-schema-constrained response + record-to-fixture.
"""
from __future__ import annotations

from mealog.domain.models import PerceivedItem

PROMPT_VERSION = "p1"

SYSTEM_PROMPT = """You list what food is visible. You do NOT estimate nutrition.
Return JSON: {"items":[{"surface_form","cooking_method","portion_hint","confidence"}]}
Rules:
- Name dishes in the language on the plate's origin if you recognise it.
- If unsure between two dishes, return the more general one and lower confidence.
- Never invent an item you cannot see. Omission is cheaper than invention.
"""


class GeminiVision:
    name = "gemini"

    def __init__(self, api_key: str, model: str = "gemini-flash-latest"):
        self.api_key, self.model = api_key, model

    def perceive(self, sample_id: str, text: str | None = None) -> list[PerceivedItem]:
        raise NotImplementedError("wired on Friday; use VISION_PROVIDER=fixture until then")
