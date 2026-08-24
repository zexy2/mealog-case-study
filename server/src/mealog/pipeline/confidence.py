"""Routing: what the product does when it is unsure.

Coverage is allowed to drop in an unfamiliar market; accuracy is not. That
trade is expressed here and measured as the risk-coverage curve in eval/.
"""
from mealog.domain.models import MealLog, ResolvedItem

AUTO_ACCEPT = 0.75
ASK_BELOW = 0.40
VISION_COUNT_CONFIDENCE = 0.60

_CAPTURE_MEDIUM_QUESTIONS = {
    "screen": "This image appears to show food on a screen. Please upload a direct photo of the real meal.",
    "printed": "This image appears to be printed food imagery. Please upload a direct photo of the real meal.",
    "toy_or_model": "This image may show a toy or model rather than real food. Please upload a direct photo of the real meal.",
    "unclear": "I could not confirm this is a direct photo of a real meal. Please upload a clearer meal photo.",
}


def capture_medium_question(item: ResolvedItem) -> str | None:
    """Every non-real_plate medium is a red flag, never positive evidence."""
    if item.capture_medium == "real_plate":
        return None
    return _CAPTURE_MEDIUM_QUESTIONS.get(item.capture_medium, _CAPTURE_MEDIUM_QUESTIONS["unclear"])


def count_confidence(item) -> float:
    """Visual count is weaker evidence than a user-entered count."""
    if item.count_origin == "vision" and item.quantity is not None:
        return VISION_COUNT_CONFIDENCE
    return 1.0


def route(log: MealLog) -> MealLog:
    if not log.items:
        log.action, log.question = "ask", "I could not read this meal. What did you eat?"
        return log

    medium_flag = next((item for item in log.items if item.capture_medium != "real_plate"), None)
    if medium_flag is not None:
        log.action = "ask"
        log.question = capture_medium_question(medium_flag)
        return log

    if any(i.abstained for i in log.items):
        unknown = next(i for i in log.items if i.abstained)
        log.action = "ask"
        log.question = f"I could not match '{unknown.query}'. Which of these is closest?"
        return log

    if any(i.quantity is None for i in log.items):
        log.action = "review"
        return log

    lowest = min(min(i.confidence, count_confidence(i)) for i in log.items)
    if lowest >= AUTO_ACCEPT:
        log.action = "auto_accept"
    elif lowest < ASK_BELOW:
        item = min(log.items, key=lambda i: i.confidence)
        log.action = "ask"
        log.question = f"Is '{item.query}' {item.candidates[0].name if item.candidates else 'correct'}?"
    else:
        log.action = "review"
    return log
