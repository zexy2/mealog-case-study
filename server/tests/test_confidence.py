"""Confidence gate must account for portion evidence as well as identity."""
from mealog.domain.models import Candidate, MealLog, ResolvedItem
from mealog.pipeline.confidence import effective_confidence, portion_confidence, route


def resolved_item(*, confidence: float, grams_p10: float, grams: float = 100.0,
                  grams_p90: float = 100.0) -> ResolvedItem:
    return ResolvedItem(
        query="white rice",
        food_id="us.rice_white_cooked",
        candidates=[Candidate(food_id="us.rice_white_cooked", name="White rice", score=0.99)],
        grams=grams,
        grams_p10=grams_p10,
        grams_p90=grams_p90,
        confidence=confidence,
    )


def meal(item: ResolvedItem) -> MealLog:
    return MealLog(idempotency_key="test-confidence", locale="en_US", items=[item])


def test_wide_portion_band_alone_prevents_auto_accept():
    item = resolved_item(confidence=0.99, grams_p10=45.0, grams_p90=175.0)

    routed = route(meal(item))

    assert portion_confidence(item) == 0.0
    assert item.confidence == 0.0
    assert routed.action == "ask"


def test_narrow_portion_band_preserves_high_confidence_acceptance():
    item = resolved_item(confidence=0.90, grams_p10=99.0, grams_p90=101.0)

    routed = route(meal(item))

    assert effective_confidence(item) == 0.90
    assert routed.action == "auto_accept"


def test_retrieval_uncertainty_still_controls_narrow_portion():
    item = resolved_item(confidence=0.35, grams_p10=99.0, grams_p90=101.0)

    routed = route(meal(item))

    assert item.confidence == 0.35
    assert routed.action == "ask"


def test_missing_portion_interval_fails_closed():
    item = resolved_item(confidence=0.99, grams_p10=0.0, grams_p90=0.0)

    routed = route(meal(item))

    assert item.confidence == 0.0
    assert routed.action == "ask"
