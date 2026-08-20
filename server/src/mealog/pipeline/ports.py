"""Boundaries between input transport, vision providers and the pipeline."""
from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
from typing import Protocol

from mealog.domain.models import PerceivedItem


@dataclass(frozen=True)
class VisionInput:
    """One perception input.

    ``sample_id`` is a fixture-only compatibility path. Real providers must
    receive image bytes or explicit text; image fixture keys use
    ``content_hash`` so an ID cannot accidentally stand in for a photograph.
    """

    image_bytes: bytes | None = None
    image_media_type: str | None = None
    text: str | None = None
    sample_id: str | None = None

    def __post_init__(self) -> None:
        if self.image_bytes is not None and not isinstance(self.image_bytes, bytes):
            raise TypeError("image_bytes must be bytes")
        if self.image_bytes is not None and not self.image_media_type:
            raise ValueError("image_media_type is required with image_bytes")
        if not any((self.image_bytes, self.text and self.text.strip(), self.sample_id)):
            raise ValueError("VisionInput needs image bytes, text, or sample_id")

    @property
    def content_hash(self) -> str | None:
        if self.image_bytes is None:
            return None
        return sha256(self.image_bytes).hexdigest()

    @property
    def fixture_key(self) -> str | None:
        return self.content_hash or self.sample_id

    @property
    def log_reference(self) -> str:
        return self.fixture_key or "text-input"


class VisionPort(Protocol):
    """Turns image/text input into observed items. Never returns nutrients."""

    name: str

    def perceive(self, input: VisionInput) -> list[PerceivedItem]: ...
