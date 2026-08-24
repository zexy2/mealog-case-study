from mealog.domain.models import Candidate, MealLog, ResolvedItem
from mealog.pipeline.confidence import count_confidence, route


def item(origin: str | None) -> ResolvedItem:
    return ResolvedItem(
        query="simit",
        food_id="tr.simit",
        candidates=[Candidate(food_id="tr.simit", name="Simit", score=1.0)],
        quantity=2,
        count_origin=origin,
        confidence=1.0,
    )


def test_vision_count_is_weighted_below_user_text_count():
    assert count_confidence(item("vision")) < count_confidence(item("user_text"))


def test_non_real_capture_medium_blocks_even_perfect_single_item():
    resolved = item("user_text")
    resolved.capture_medium = "screen"
    resolved.grams = 100
    resolved.grams_p10 = 90
    resolved.grams_p90 = 110

    routed = route(MealLog(idempotency_key="k", locale="en", items=[resolved]))

    assert routed.action == "ask"
    assert "screen" in (routed.question or "").lower()


def test_real_plate_remains_neutral():
    resolved = item("user_text")
    resolved.grams = 100
    resolved.grams_p10 = 90
    resolved.grams_p90 = 110

    assert route(MealLog(idempotency_key="k", locale="en", items=[resolved])).action == "auto_accept"
