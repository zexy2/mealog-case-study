"""Routing: what the product does when it is unsure.

Coverage is allowed to drop in an unfamiliar market; accuracy is not. That
trade is expressed here and measured as the risk-coverage curve in eval/.
"""
from mealog.domain.models import MealLog

AUTO_ACCEPT = 0.75
ASK_BELOW = 0.40


def route(log: MealLog) -> MealLog:
    if not log.items:
        log.action, log.question = "ask", "I could not read this meal. What did you eat?"
        return log

    if any(i.abstained for i in log.items):
        unknown = next(i for i in log.items if i.abstained)
        log.action = "ask"
        log.question = f"I could not match '{unknown.query}'. Which of these is closest?"
        return log

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
