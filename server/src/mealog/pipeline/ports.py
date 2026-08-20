"""Boundaries. Two implementations exist for VisionPort (real provider and
recorded fixtures), which is the reason this abstraction is allowed to exist --
an interface with a single implementation would just be ceremony."""
from typing import Protocol

from mealog.domain.models import PerceivedItem


class VisionPort(Protocol):
    """Turns an input reference into observed items. Never returns nutrients
    except via `ungrounded_kcal`, which only the V0 baseline reads."""

    name: str

    def perceive(self, sample_id: str, text: str | None = None) -> list[PerceivedItem]: ...
