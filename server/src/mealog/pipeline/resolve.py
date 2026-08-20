"""Closed-set resolution.

The resolver may only return a food_id that retrieval put on the table, or
ABSTAIN. That constraint -- not the prompt -- is what makes E3 (hallucinated
item) structurally impossible. If E3 ever shows up in an eval after V1, it is a
bug here, not model misbehaviour.
"""
from mealog.domain.models import ABSTAIN, Candidate, ResolvedItem

#: Below this score we would rather say nothing than say something wrong.
MIN_ACCEPT_SCORE = 0.34


def resolve(query: str, candidates: list[Candidate],
            allow_abstain: bool = True) -> ResolvedItem:
    if not candidates:
        return ResolvedItem(query=query, food_id=ABSTAIN, candidates=[], confidence=0.0)

    best = candidates[0]
    runner_up = candidates[1].score if len(candidates) > 1 else 0.0
    # Margin matters as much as absolute score: two equally plausible matches is
    # a question for the user, not a coin flip.
    margin = best.score - runner_up
    confidence = round(min(1.0, 0.6 * best.score + 0.4 * min(margin * 2, 1.0)), 3)

    if allow_abstain and best.score < MIN_ACCEPT_SCORE:
        return ResolvedItem(query=query, food_id=ABSTAIN, candidates=candidates,
                            confidence=confidence)

    return ResolvedItem(query=query, food_id=best.food_id, candidates=candidates,
                        confidence=confidence)
