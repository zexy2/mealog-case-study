"""Mass estimation.

Returns a distribution, not a point. Calorie error is dominated by mass error
(see docs/finetuning-plan.md), so the honest output is a median with a p10/p90
band that the UI and the confidence gate can both read.
"""
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


def _spread_for_unit(quantity: float | None) -> tuple[float, float]:
    return EXPLICIT_UNIT_SPREAD if quantity is not None else ASSUMED_QUANTITY_SPREAD


def estimate(food: CanonicalFood, quantity: float | None, unit: str | None,
             pack: LocalePack) -> tuple[float, float, float]:
    """-> (grams, p10, p90)"""
    grams = food.default_serving_g
    spread = DEFAULT_SPREAD

    if unit and (conv := pack.units.get(unit)):
        multiplier = quantity if quantity is not None else 1.0
        if conv.get("g"):
            grams = conv["g"] * multiplier
            spread = _spread_for_unit(quantity)
        elif conv.get("ml"):
            density = food.density_g_per_ml
            if isinstance(density, (int, float)) and density > 0:
                grams = conv["ml"] * density * multiplier
                spread = _spread_for_unit(quantity)
            else:
                # Do not silently turn volume into mass. The midpoint is an
                # explicit, documented fallback only; the wide interval is
                # the signal consumed later by confidence routing.
                grams = (conv["ml"] * UNKNOWN_DENSITY_MIDPOINT_G_PER_ML
                          * multiplier)
                spread = UNKNOWN_DENSITY_SPREAD
    elif quantity is not None:
        grams = food.default_serving_g * quantity
        spread = (0.75, 1.35)

    return round(grams, 1), round(grams * spread[0], 1), round(grams * spread[1], 1)
