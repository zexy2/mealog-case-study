"""A locale is data, not code.

Adding a market means dropping a directory into locale_packs/ and running the
eval. Nothing in server/src imports a locale by name; if it ever does, that is
the regression this loader exists to prevent.

Data licences are enforced *here*, at load time, and not only in CI. CI runs
once on a branch; `load()` runs in production, which is where the legal
exposure actually is. See issue #8.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from enum import Enum
from functools import cache
from pathlib import Path

import yaml

from mealog.config import settings
from mealog.domain.models import CanonicalFood, Nutrients

PACK_ROOT = Path(__file__).resolve().parents[4] / "locale_packs"

COMMERCIAL_MODE_ENV = "MEALOG_COMMERCIAL_MODE"


class LicenseTerm(str, Enum):
    """Fixed vocabulary for `pack.yaml`'s `license` field.

    Free text was the previous state and cannot be reasoned about: a typo in a
    sentence silently reads as permissive. An enum is mechanically checkable,
    which is what turns the declaration into a control.
    """

    PUBLIC_DOMAIN = "public-domain"
    PERMISSIVE = "permissive"
    RESTRICTED_NONCOMMERCIAL = "restricted-noncommercial"
    UNVERIFIED = "unverified"


class CommercialUse(str, Enum):
    ALLOWED = "allowed"
    PROHIBITED = "prohibited"
    UNKNOWN = "unknown"


#: `UNVERIFIED` maps to `UNKNOWN`, and `UNKNOWN` is refused in commercial mode.
#: In licensing, silence is not permission -- an unchecked source is a source we
#: have no right to, until someone checks it.
_COMMERCIAL_USE: dict[LicenseTerm, CommercialUse] = {
    LicenseTerm.PUBLIC_DOMAIN: CommercialUse.ALLOWED,
    LicenseTerm.PERMISSIVE: CommercialUse.ALLOWED,
    LicenseTerm.RESTRICTED_NONCOMMERCIAL: CommercialUse.PROHIBITED,
    LicenseTerm.UNVERIFIED: CommercialUse.UNKNOWN,
}


class RestrictedPackError(RuntimeError):
    """Raised when a pack's data licence forbids the current deployment mode."""


def parse_license(value: object) -> LicenseTerm:
    """Map a `pack.yaml` licence value onto the vocabulary, failing closed.

    An unrecognised value becomes `UNVERIFIED` rather than an exception: an
    unparseable licence is exactly the case where we do not know our rights,
    and treating it as restricted is the safe reading. `check_invariants.py`
    rejects such a value in CI, so this path is a runtime backstop, not a
    silent tolerance.
    """
    try:
        return LicenseTerm(str(value).strip().lower())
    except ValueError:
        return LicenseTerm.UNVERIFIED


@dataclass
class LocalePack:
    locale: str
    cuisine_bucket: str
    nutrition_source: str
    license: LicenseTerm
    #: Human-readable provenance. Never parsed -- the enum above is the control.
    license_note: str | None = None
    foods: dict[str, CanonicalFood] = field(default_factory=dict)
    aliases: dict[str, list[str]] = field(default_factory=dict)
    negative_aliases: dict[str, list[str]] = field(default_factory=dict)
    units: dict[str, dict] = field(default_factory=dict)
    text_rules: dict = field(default_factory=dict)

    @property
    def commercial_use(self) -> CommercialUse:
        return _COMMERCIAL_USE[self.license]


def _jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def _enforce_commercial_license(pack: LocalePack) -> None:
    """Fail closed. A warning in a log is not a legal control."""
    use = pack.commercial_use
    if use is CommercialUse.ALLOWED:
        return
    reason = (
        "its data licence prohibits commercial use"
        if use is CommercialUse.PROHIBITED
        else "its data licence has not been verified, and unverified is treated as prohibited"
    )
    raise RestrictedPackError(
        f"locale pack '{pack.locale}' cannot be served in commercial mode: {reason}. "
        f"license={pack.license.value} source={pack.nutrition_source!r}. "
        f"Either unset {COMMERCIAL_MODE_ENV}, drop this pack from the deployment, "
        f"or replace its nutrition source with one that permits commercial use."
    )


@cache
def _read_pack(locale: str, root: str | None = None) -> LocalePack:
    base = Path(root) if root else PACK_ROOT
    d = base / locale
    if not d.exists():
        raise FileNotFoundError(f"no locale pack at {d}")

    meta = yaml.safe_load((d / "pack.yaml").read_text(encoding="utf-8"))
    pack = LocalePack(
        locale=meta["locale"],
        cuisine_bucket=meta["cuisine_bucket"],
        nutrition_source=meta["nutrition_source"],
        license=parse_license(meta.get("license")),
        license_note=meta.get("license_note"),
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


def load(locale: str, root: str | None = None, *,
         commercial_mode: bool | None = None) -> LocalePack:
    """Load a pack, refusing it if its licence forbids the deployment mode.

    Reading is cached; the licence gate deliberately is **not**. A pack already
    in the cache from an earlier call must not be handed out for free once
    commercial mode is on, or the first caller would silently unlock it for
    every caller after it.
    """
    pack = _read_pack(locale, root)
    commercial = settings.commercial_mode if commercial_mode is None else commercial_mode
    if commercial:
        _enforce_commercial_license(pack)
    return pack


def available(root: str | None = None) -> list[str]:
    base = Path(root) if root else PACK_ROOT
    return sorted(p.name for p in base.iterdir() if (p / "pack.yaml").exists())
