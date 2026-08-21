"""A locale is data, not code.

Adding a market means dropping a directory into locale_packs/ and running the
eval. Nothing in server/src imports a locale by name; if it ever does, that is
the regression this loader exists to prevent.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from functools import cache
from pathlib import Path

import yaml

from mealog.domain.models import CanonicalFood, Nutrients

PACK_ROOT = Path(__file__).resolve().parents[4] / "locale_packs"


@dataclass
class LocalePack:
    locale: str
    cuisine_bucket: str
    nutrition_source: str
    license: str
    foods: dict[str, CanonicalFood] = field(default_factory=dict)
    aliases: dict[str, list[str]] = field(default_factory=dict)
    negative_aliases: dict[str, list[str]] = field(default_factory=dict)
    units: dict[str, dict] = field(default_factory=dict)
    text_rules: dict = field(default_factory=dict)


def _jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


@cache
def load(locale: str, root: str | None = None) -> LocalePack:
    base = Path(root) if root else PACK_ROOT
    d = base / locale
    if not d.exists():
        raise FileNotFoundError(f"no locale pack at {d}")

    meta = yaml.safe_load((d / "pack.yaml").read_text(encoding="utf-8"))
    pack = LocalePack(
        locale=meta["locale"],
        cuisine_bucket=meta["cuisine_bucket"],
        nutrition_source=meta["nutrition_source"],
        license=meta["license"],
        text_rules=yaml.safe_load((d / "text_rules.yaml").read_text(encoding="utf-8")) or {},
    )

    for row in _jsonl(d / "foods.jsonl"):
        pack.foods[row["food_id"]] = CanonicalFood(
            food_id=row["food_id"], name=row["name"],
            per_100g=Nutrients(**row["per_100g"]),
            default_serving_g=row["default_serving_g"],
            default_serving_name=row["default_serving_name"],
            source=row["source"], locale=pack.locale,
            density_g_per_ml=row.get("density_g_per_ml"),
            density_source=row.get("density_source"),
        )

    for row in _jsonl(d / "aliases.jsonl"):
        pack.aliases[row["food_id"]] = row.get("alias", [])
        if neg := row.get("negative_alias"):
            pack.negative_aliases[row["food_id"]] = neg

    for row in _jsonl(d / "units.jsonl"):
        pack.units[row["unit"]] = {k: v for k, v in row.items() if k != "unit"}

    return pack


def available(root: str | None = None) -> list[str]:
    base = Path(root) if root else PACK_ROOT
    return sorted(p.name for p in base.iterdir() if (p / "pack.yaml").exists())
