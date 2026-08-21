"""Mass estimates must expose density and evidence uncertainty."""
from copy import deepcopy

import pytest
from pydantic import ValidationError

from mealog.domain.models import CanonicalFood, Nutrients
from mealog.locales.loader import load
from mealog.pipeline.portion import (
    DEFAULT_SPREAD,
    UNKNOWN_DENSITY_SPREAD,
    estimate,
)


def test_non_water_volume_uses_unknown_density_interval():
    pack = load("tr")
    food = pack.foods["tr.kuru_fasulye"]

    grams, p10, p90 = estimate(food, 2.0, "kepce", pack)

    assert grams == pytest.approx(300.0, abs=0.01)
    assert p10 == pytest.approx(135.0, abs=0.01)
    assert p90 == pytest.approx(525.0, abs=0.01)


def test_missing_density_widens_volume_interval():
    pack = deepcopy(load("en_US"))
    pack.units["unclassified_volume"] = {"ml": 200}
    food = pack.foods["us.chicken_breast_grilled"]

    grams, p10, p90 = estimate(food, 1.0, "unclassified_volume", pack)

    assert grams == pytest.approx(200.0, abs=0.1)
    assert (p10, p90) == pytest.approx(
        (grams * UNKNOWN_DENSITY_SPREAD[0], grams * UNKNOWN_DENSITY_SPREAD[1]),
        abs=0.1,
    )
    assert p10 < grams * DEFAULT_SPREAD[0]
    assert p90 > grams * DEFAULT_SPREAD[1]


def test_missing_quantity_does_not_get_explicit_unit_spread():
    pack = load("tr")
    food = pack.foods["tr.kuru_fasulye"]

    grams, p10, p90 = estimate(food, None, "kepce", pack)

    assert grams == pytest.approx(150.0, abs=0.1)
    assert (p10, p90) == pytest.approx(
        (grams * UNKNOWN_DENSITY_SPREAD[0], grams * UNKNOWN_DENSITY_SPREAD[1]),
        abs=0.1,
    )
    assert p10 < grams * 0.8
    assert p90 > grams * 1.25


def test_known_food_density_narrows_volume_interval():
    pack = load("en_US")
    food = pack.foods["us.rice_white_cooked"]

    grams, p10, p90 = estimate(food, 1.0, "cup", pack)

    assert grams == pytest.approx(158.0, abs=0.1)
    assert (p10, p90) == pytest.approx((126.4, 197.5), abs=0.1)
    assert p10 > grams * UNKNOWN_DENSITY_SPREAD[0]
    assert p90 < grams * UNKNOWN_DENSITY_SPREAD[1]
    assert food.density_source


@pytest.mark.parametrize("density_source", [None, ""])
def test_density_requires_a_source(density_source):
    with pytest.raises(ValidationError):
        CanonicalFood(
            food_id="test.food",
            name="Test food",
            per_100g=Nutrients(kcal=1),
            default_serving_g=100,
            default_serving_name="1 serving",
            source="test",
            locale="test",
            density_g_per_ml=1.0,
            density_source=density_source,
        )


@pytest.mark.parametrize("locale", ["en_US", "tr", "ja_JP"])
def test_volume_units_never_carry_density(locale: str):
    pack = load(locale)
    volume_units = [conversion for conversion in pack.units.values() if "ml" in conversion]

    assert volume_units
    for conversion in volume_units:
        assert "density_g_per_ml" not in conversion
        assert "density_source" not in conversion
