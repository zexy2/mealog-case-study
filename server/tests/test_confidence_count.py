from mealog.domain.models import Candidate, ResolvedItem
from mealog.pipeline.confidence import count_confidence


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
