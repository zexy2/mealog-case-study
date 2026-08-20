"""The anti-hallucination guarantee, asserted rather than hoped for."""
from mealog.domain.models import ABSTAIN
from mealog.locales.loader import load
from mealog.pipeline.resolve import resolve
from mealog.pipeline.retrieval import search


def test_resolver_never_invents_a_food_id():
    pack = load("en_US")
    r = resolve("unicorn casserole", search("unicorn casserole", pack))
    assert r.food_id == ABSTAIN or r.food_id in pack.foods


def test_unknown_food_abstains_rather_than_guessing():
    pack = load("en_US")
    r = resolve("zzzz nonexistent dish", search("zzzz nonexistent dish", pack))
    assert r.abstained
