"""Mass estimates must expose density and evidence uncertainty."""
from copy import deepcopy

import pytest

from mealog.locales.loader import load
from mealog.pipeline.portion import (
    DEFAULT_SPREAD,
    UNKNOWN_DENSITY_SPREAD,
    estimate,
)


def test_non_water_volume_uses_declared_density():
    pack = load("tr")
    food = pack.foods["tr.mercimek_corbasi"]

    grams, p10, p90 = estimate(food, 2.0, "kepce", pack)

    assert grams == pytest.approx(309.9, abs=0.01)
    assert p10 == pytest.approx(247.9, abs=0.01)
    assert p90 == pytest.approx(387.4, abs=0.01)


def test_missing_density_widens_volume_interval():
    pack = deepcopy(load("en_US"))
    pack.units["unclassified_volume"] = {"ml": 200}
    food = pack.foods["us.rice_white_cooked"]

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
    food = pack.foods["tr.mercimek_corbasi"]

    grams, p10, p90 = estimate(food, None, "kepce", pack)

    assert grams == pytest.approx(155.0, abs=0.1)
    assert (p10, p90) == pytest.approx(
        (grams * DEFAULT_SPREAD[0], grams * DEFAULT_SPREAD[1]),
        abs=0.1,
    )


@pytest.mark.parametrize("locale", ["en_US", "tr", "ja_JP"])
def test_every_volume_unit_declares_density_provenance(locale: str):
    pack = load(locale)
    volume_units = [conversion for conversion in pack.units.values() if "ml" in conversion]

    assert volume_units
    for conversion in volume_units:
        assert conversion["density_g_per_ml"] > 0
        assert conversion["density_source"]
