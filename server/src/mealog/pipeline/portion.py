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


def estimate(food: CanonicalFood, quantity: float | None, unit: str | None,
             pack: LocalePack) -> tuple[float, float, float]:
    """-> (grams, p10, p90)"""
    grams = food.default_serving_g
    spread = DEFAULT_SPREAD

    if unit and (conv := pack.units.get(unit)):
        base = conv.get("g") or conv.get("ml")  # 1 ml ~ 1 g for day-0; density table is Friday
        if base:
            grams = base * (quantity or 1.0)
            spread = (0.8, 1.25)  # an explicit unit is better evidence than a default
    elif quantity:
        grams = food.default_serving_g * quantity
        spread = (0.75, 1.35)

    return round(grams, 1), round(grams * spread[0], 1), round(grams * spread[1], 1)
