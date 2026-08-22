"""Mass estimation.

Returns a distribution, not a point. Calorie error is dominated by mass error
(see docs/finetuning-plan.md), so the honest output is a median with a p10/p90
band that the UI and the confidence gate can both read.
"""
import re
import unicodedata
from collections.abc import Iterator
from dataclasses import dataclass

from mealog.domain.models import CanonicalFood
from mealog.locales.loader import LocalePack

#: Multiplicative spread applied when we have no better information than the
#: catalogue default. Calibrated on the golden set, not guessed.
DEFAULT_SPREAD = (0.65, 1.45)

#: A stated quantity plus a known unit is stronger evidence than a catalogue
#: default, but still is not a weighed measurement.
EXPLICIT_UNIT_SPREAD = (0.8, 1.25)

#: Missing quantity must not receive EXPLICIT_UNIT_SPREAD. The unit still gives
#: us a useful centre, so the catalogue-default band is the honest fallback.
ASSUMED_QUANTITY_SPREAD = DEFAULT_SPREAD

#: A missing density has no defensible point estimate. Keep a neutral midpoint
#: for deterministic nutrition, but make the interval broad enough to expose
#: that midpoint as an assumption to the confidence stage.
UNKNOWN_DENSITY_SPREAD = (0.45, 1.75)
UNKNOWN_DENSITY_MIDPOINT_G_PER_ML = 1.0

# A printed serving or net weight is strong mass evidence. The remaining
# uncertainty is whether the user consumed exactly that amount, not whether
# the product record knows its own serving mass.
LABEL_SERVING_SPREAD = (0.90, 1.10)


@dataclass(frozen=True)
class PortionEstimate:
    """Portion values plus evidence, iterable as the legacy three-tuple."""

    grams: float
    p10: float
    p90: float
    source: str
    provenance: str

    def __iter__(self) -> Iterator[float]:
        yield self.grams
        yield self.p10
        yield self.p90


def _spread_for_unit(quantity: float | None) -> tuple[float, float]:
    return EXPLICIT_UNIT_SPREAD if quantity is not None else ASSUMED_QUANTITY_SPREAD


def _result(
    grams: float,
    spread: tuple[float, float],
    source: str,
    provenance: str,
) -> PortionEstimate:
    return PortionEstimate(
        grams=round(grams, 1),
        p10=round(grams * spread[0], 1),
        p90=round(grams * spread[1], 1),
        source=source,
        provenance=provenance,
    )


def _packaged_portion(food: CanonicalFood) -> PortionEstimate | None:
    """Use product-record mass, or explicitly mark packaged fallback.

    Provider hints such as ``32 oz container`` describe package size, not
    necessarily one label serving. A product-record serving therefore wins
    over quantity/unit parsing when present.
    """
    if food.serving_size_g is not None:
        return _result(
            food.serving_size_g,
            LABEL_SERVING_SPREAD,
            "label_serving",
            food.serving_size_source or "packaged product serving_size_g",
        )
    if food.net_weight_g is not None:
        return _result(
            food.net_weight_g,
            LABEL_SERVING_SPREAD,
            "net_weight",
            food.net_weight_source or "packaged product net_weight_g",
        )
    if food.packaged:
        return _result(
            food.default_serving_g,
            DEFAULT_SPREAD,
            "packaged_fallback",
            "fallback=catalogue.default_serving_g; "
            "product record has no serving_size_g or net_weight_g",
        )
    return None


def _normalize_serving_unit(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value.strip().casefold())
    normalized = "".join(
        character for character in normalized
        if unicodedata.category(character) != "Mn"
    )
    return re.sub(r"[\s_]+", "_", normalized.replace("ı", "i"))


def _leading_count(value: str) -> tuple[float, str] | None:
    match = re.match(
        r"^\s*(\d+(?:[.,]\d+)?(?:\s+\d+\s*/\s*\d+|\s*/\s*\d+)?)\s+(.+?)\s*$",
        value,
    )
    if match is None:
        return None

    count_parts = match.group(1).replace(",", ".").strip().split()
    if len(count_parts) == 2 and "/" in count_parts[1]:
        numerator, denominator = (float(part) for part in count_parts[1].split("/", 1))
        if denominator == 0:
            return None
        count = float(count_parts[0]) + numerator / denominator
    elif len(count_parts) == 1 and "/" in count_parts[0]:
        numerator, denominator = (float(part) for part in count_parts[0].split("/", 1))
        if denominator == 0:
            return None
        count = numerator / denominator
    else:
        count = float(count_parts[0])
    if count <= 0:
        return None
    return count, match.group(2)


def _catalogue_per_unit_grams(
    food: CanonicalFood,
    requested_unit: str | None,
) -> float | None:
    if not requested_unit:
        return None
    serving = _leading_count(food.default_serving_name)
    if serving is None:
        return None
    count, serving_unit = serving
    if _normalize_serving_unit(serving_unit) != _normalize_serving_unit(requested_unit):
        return None
    return food.default_serving_g / count


def estimate(food: CanonicalFood, quantity: float | None, unit: str | None,
             pack: LocalePack, count_origin: str | None = None) -> PortionEstimate:
    """Estimate mass and evidence, preserving legacy three-value unpacking."""
    if packaged := _packaged_portion(food):
        return packaged

    grams = food.default_serving_g
    spread = DEFAULT_SPREAD
    source = "catalogue_default"
    provenance = f"catalogue.default_serving_g={food.default_serving_g:g}"

    if count_origin == "vision" and quantity is not None:
        grams = food.default_serving_g * quantity
        spread = (0.75, 1.35)
        source = "vision_count"
        provenance = (
            f"count={quantity:g}; count_origin=vision; "
            f"fallback=catalogue.default_serving_g={food.default_serving_g:g}; unit=unknown"
        )
    else:
        per_unit_grams = _catalogue_per_unit_grams(food, unit)
        if per_unit_grams is not None:
            multiplier = quantity if quantity is not None else 1.0
            grams = per_unit_grams * multiplier
            spread = _spread_for_unit(quantity)
            source = "explicit_unit" if quantity is not None else "assumed_unit"
            provenance = (
                f"unit={unit}; quantity={quantity!r}; per_unit_g={per_unit_grams:g}; "
                "source=catalogue_serving"
            )
        elif unit and (conv := pack.units.get(unit)):
            multiplier = quantity if quantity is not None else 1.0
            if conv.get("g"):
                grams = conv["g"] * multiplier
                spread = _spread_for_unit(quantity)
                source = "explicit_unit" if quantity is not None else "assumed_unit"
                provenance = f"unit={unit}; quantity={quantity!r}; conversion_g={conv['g']:g}"
            elif conv.get("ml"):
                density = food.density_g_per_ml
                if isinstance(density, (int, float)) and density > 0:
                    grams = conv["ml"] * density * multiplier
                    spread = _spread_for_unit(quantity)
                    source = "known_density" if quantity is not None else "assumed_density"
                    provenance = (
                        f"unit={unit}; quantity={quantity!r}; density_g_per_ml={density:g}; "
                        f"density_source={food.density_source}"
                    )
                else:
                    # Do not silently turn volume into mass. The midpoint is an
                    # explicit, documented fallback only; the wide interval is
                    # the signal consumed later by confidence routing.
                    grams = (conv["ml"] * UNKNOWN_DENSITY_MIDPOINT_G_PER_ML
                             * multiplier)
                    spread = UNKNOWN_DENSITY_SPREAD
                    source = "unknown_density"
                    provenance = (
                        f"unit={unit}; quantity={quantity!r}; "
                        "density_missing; midpoint_g_per_ml=1.0"
                    )
        elif quantity is not None:
            grams = food.default_serving_g * quantity
            spread = (0.75, 1.35)
            source = "catalogue_default_scaled"
            provenance = (
                f"fallback=catalogue.default_serving_g={food.default_serving_g:g}; "
                f"quantity={quantity:g}; unit=unknown"
            )

    return _result(grams, spread, source, provenance)
