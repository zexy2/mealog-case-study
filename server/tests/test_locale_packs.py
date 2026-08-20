"""Every pack must be loadable and internally consistent. This is the test that
makes 'adding a market is a data change' safe to believe."""
import pytest

from mealog.locales.loader import available, load


@pytest.mark.parametrize("locale", available())
def test_pack_loads_and_aliases_point_at_real_foods(locale):
    pack = load(locale)
    assert pack.foods, f"{locale} has no foods"
    assert pack.license, f"{locale} must declare a data license"
    for food_id in pack.aliases:
        assert food_id in pack.foods, f"{locale}: alias for unknown food {food_id}"


def test_turkish_dotless_i_folds_for_retrieval():
    from mealog.pipeline.normalize import fold
    pack = load("tr")
    # 'Mercimek Corbasi' typed with either I must reach the same retrieval key.
    assert fold("MERCIMEK", pack) == fold("mercimek", pack) == "mercimek"
