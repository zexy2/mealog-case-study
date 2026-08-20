"""The only place nutrient numbers are produced. Pure, deterministic, unit
tested, and model-free -- this is what makes 'the LLM cannot hallucinate your
calories' an architectural claim rather than a prompt-engineering hope."""
from mealog.domain.models import CanonicalFood, Nutrients


def scale_per_100g(per_100g: Nutrients, grams: float) -> Nutrients:
    if grams < 0:
        raise ValueError("grams must be non-negative")
    factor = grams / 100.0
    return Nutrients(
        kcal=per_100g.kcal * factor,
        protein_g=per_100g.protein_g * factor,
        carb_g=per_100g.carb_g * factor,
        fat_g=per_100g.fat_g * factor,
    )


def total(pairs: list[tuple[CanonicalFood, float]]) -> Nutrients:
    """Sum nutrients over (food, grams) pairs."""
    acc = Nutrients()
    for food, grams in pairs:
        acc = acc + scale_per_100g(food.per_100g, grams)
    return acc
