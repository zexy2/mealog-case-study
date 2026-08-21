"""Every pack must be loadable and internally consistent. This is the test that
makes 'adding a market is a data change' safe to believe.

The licence tests below are the enforcement half of that claim: a pack may
declare restrictive terms, and in commercial mode the loader must refuse it
rather than log about it (issue #8).
"""
import pytest

from mealog.config import Settings
from mealog.locales.loader import (
    CommercialUse,
    LicenseTerm,
    RestrictedPackError,
    available,
    load,
    parse_license,
)


@pytest.mark.parametrize("locale", available())
def test_pack_loads_and_aliases_point_at_real_foods(locale):
    pack = load(locale)
    assert pack.foods, f"{locale} has no foods"
    assert pack.license, f"{locale} must declare a data license"
    for food_id in pack.aliases:
        assert food_id in pack.foods, f"{locale}: alias for unknown food {food_id}"
    for food in pack.foods.values():
        assert (food.density_g_per_ml is None) == (food.density_source is None)
        if food.density_g_per_ml is not None:
            assert food.density_g_per_ml > 0
            assert food.density_source.strip()


def test_turkish_dotless_i_folds_for_retrieval():
    from mealog.pipeline.normalize import fold
    pack = load("tr")
    # 'Mercimek Corbasi' typed with either I must reach the same retrieval key.
    assert fold("MERCIMEK", pack) == fold("mercimek", pack) == "mercimek"


# --- licence vocabulary -----------------------------------------------------


@pytest.mark.parametrize("locale", available())
def test_every_pack_declares_a_license_from_the_vocabulary(locale):
    """Free text is not checkable. `check_invariants.py` enforces the same rule
    in CI; this fails faster and closer to the code that depends on it."""
    assert load(locale).license in set(LicenseTerm)


def test_unrecognised_license_is_treated_as_unverified():
    """Fail closed. An unparseable licence is precisely the case where we do
    not know our rights, so it must not read as permission."""
    assert parse_license("RESTRICTED - non-commercial") is LicenseTerm.UNVERIFIED
    assert parse_license(None) is LicenseTerm.UNVERIFIED
    assert parse_license("") is LicenseTerm.UNVERIFIED


def test_unverified_is_not_treated_as_permission():
    assert LicenseTerm.UNVERIFIED not in _permissive_terms()


def _permissive_terms() -> set[LicenseTerm]:
    return {t for t in LicenseTerm
            if _use_of(t) is CommercialUse.ALLOWED}


def _use_of(term: LicenseTerm) -> CommercialUse:
    from mealog.locales.loader import _COMMERCIAL_USE
    return _COMMERCIAL_USE[term]


def _packs_where(use: CommercialUse) -> list[str]:
    return [loc for loc in available() if load(loc).commercial_use is use]


# --- enforcement ------------------------------------------------------------


def test_commercial_mode_is_off_by_default():
    """Development, tests and the offline eval must behave exactly as before.
    D4 (a reviewer can reproduce the scorecard) depends on this staying false."""
    assert Settings().commercial_mode is False


@pytest.mark.parametrize("locale", _packs_where(CommercialUse.PROHIBITED))
def test_restricted_pack_refuses_to_load_in_commercial_mode(locale):
    with pytest.raises(RestrictedPackError) as exc:
        load(locale, commercial_mode=True)
    message = str(exc.value)
    assert locale in message, "the error must name the pack"
    assert "MEALOG_COMMERCIAL_MODE" in message, "the error must name the way out"


@pytest.mark.parametrize("locale", _packs_where(CommercialUse.UNKNOWN))
def test_unverified_pack_refuses_to_load_in_commercial_mode(locale):
    """Silence is not permission: unknown terms behave like prohibited ones."""
    with pytest.raises(RestrictedPackError):
        load(locale, commercial_mode=True)


@pytest.mark.parametrize("locale", _packs_where(CommercialUse.PROHIBITED)
                         + _packs_where(CommercialUse.UNKNOWN))
def test_restricted_pack_still_loads_in_development(locale):
    assert load(locale, commercial_mode=False).foods


@pytest.mark.parametrize("locale", _packs_where(CommercialUse.ALLOWED))
def test_permissive_pack_loads_in_commercial_mode(locale):
    assert load(locale, commercial_mode=True).foods


def test_cache_does_not_let_a_restricted_pack_through():
    """The read is cached; the licence gate must not be.

    Otherwise the first caller in development warms the cache and every later
    caller gets the pack for free, including in commercial mode. That is the
    failure mode a naive `@cache` on `load()` produces.
    """
    restricted = _packs_where(CommercialUse.PROHIBITED)
    if not restricted:
        pytest.skip("no restricted pack in the tree")
    locale = restricted[0]
    load(locale, commercial_mode=False)          # warm the cache
    with pytest.raises(RestrictedPackError):
        load(locale, commercial_mode=True)       # must still be refused


def test_pack_with_an_unknown_license_string_is_refused(tmp_path):
    """A pack whose licence CI has not seen must not be served commercially."""
    d = tmp_path / "xx_TEST"
    d.mkdir()
    (d / "pack.yaml").write_text(
        "locale: xx_TEST\ncuisine_bucket: other_mixed\n"
        "nutrition_source: hand-typed\nlicense: probably fine honestly\n",
        encoding="utf-8")
    (d / "text_rules.yaml").write_text("{}\n", encoding="utf-8")

    assert load("xx_TEST", root=str(tmp_path)).license is LicenseTerm.UNVERIFIED
    with pytest.raises(RestrictedPackError):
        load("xx_TEST", root=str(tmp_path), commercial_mode=True)
