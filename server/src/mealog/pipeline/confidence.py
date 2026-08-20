"""Routing: what the product does when it is unsure.

Coverage is allowed to drop in an unfamiliar market; accuracy is not. That
trade is expressed here and measured as the risk-coverage curve in eval/.
"""
import math

from mealog.domain.models import MealLog, ResolvedItem

AUTO_ACCEPT = 0.75
ASK_BELOW = 0.40


def portion_confidence(item: ResolvedItem) -> float:
    """Map relative p10/p90 width to a bounded confidence signal.

    A zero-width band scores 1.0. When the interval spans the whole median
    estimate, score reaches 0.0. Missing or malformed interval data fails
    closed instead of allowing a retrieval-only auto-accept.
    """
    if (not all(math.isfinite(value) for value in
                (item.grams, item.grams_p10, item.grams_p90))
            or not 0 < item.grams_p10 <= item.grams <= item.grams_p90):
        return 0.0

    relative_width = (item.grams_p90 - item.grams_p10) / item.grams
    return round(max(0.0, min(1.0, 1.0 - relative_width)), 3)


def effective_confidence(item: ResolvedItem) -> float:
    """Use weakest evidence: identity match or portion estimate."""
    item.confidence = round(min(item.confidence, portion_confidence(item)), 3)
    return item.confidence


def route(log: MealLog) -> MealLog:
    if not log.items:
        log.action, log.question = "ask", "I could not read this meal. What did you eat?"
        return log

    if any(i.abstained for i in log.items):
        unknown = next(i for i in log.items if i.abstained)
        log.action = "ask"
        log.question = f"I could not match '{unknown.query}'. Which of these is closest?"
        return log

    for item in log.items:
        effective_confidence(item)

    lowest = min(i.confidence for i in log.items)
    if lowest >= AUTO_ACCEPT:
        log.action = "auto_accept"
    elif lowest < ASK_BELOW:
        item = min(log.items, key=lambda i: i.confidence)
        log.action = "ask"
        log.question = f"Is '{item.query}' {item.candidates[0].name if item.candidates else 'correct'}?"
    else:
        log.action = "review"
    return log
