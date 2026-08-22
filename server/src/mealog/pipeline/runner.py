"""Pipeline orchestration and the ablation configs.

Each config turns one idea on. That is what makes the scorecard an argument
rather than a number: V0 is what a single prompt gets you, and every row after
it has to pay for itself.
"""
from __future__ import annotations

from dataclasses import dataclass

from mealog import obs
from mealog.domain.models import MealLog, Nutrients, ResolvedItem
from mealog.locales.loader import LocalePack, load
from mealog.pipeline import normalize, nutrition, portion, retrieval
from mealog.pipeline.confidence import route
from mealog.pipeline.ports import VisionInput, VisionPort
from mealog.pipeline.resolve import resolve


@dataclass(frozen=True)
class Config:
    name: str
    description: str
    grounded: bool = True       # resolve against catalogue + compute nutrition
    locale_rules: bool = True   # apply locale text/unit normalization
    gating: bool = True         # confidence routing + abstention


CONFIGS: dict[str, Config] = {
    "V0": Config("V0", "single-prompt VLM, model reports calories directly",
                 grounded=False, locale_rules=False, gating=False),
    "V1": Config("V1", "+ closed-set resolution, nutrition computed from catalogue",
                 grounded=True, locale_rules=False, gating=False),
    "V2": Config("V2", "+ locale text and unit normalization",
                 grounded=True, locale_rules=True, gating=False),
    "V3": Config("V3", "+ confidence gating and abstention",
                 grounded=True, locale_rules=True, gating=True),
}


def _reconcile_resolved(items: list[ResolvedItem]) -> list[ResolvedItem]:
    """Collapse repeated grounded foods while preserving every abstention.

    ``ABSTAIN`` is a sentinel rather than a food, so different unmatched
    queries stay as separate questions. A known count can be added; one
    unknown contribution makes the merged count unknown.
    """
    by_food: dict[str, ResolvedItem] = {}
    reconciled: list[ResolvedItem] = []

    for item in items:
        if item.abstained:
            reconciled.append(item)
            continue

        existing = by_food.get(item.food_id)
        if existing is None:
            by_food[item.food_id] = item
            reconciled.append(item)
            continue

        existing.quantity = (
            None
            if existing.quantity is None or item.quantity is None
            else existing.quantity + item.quantity
        )
        existing.unit = existing.unit if existing.unit == item.unit else None
        existing.count_origin = (
            existing.count_origin
            if existing.count_origin == item.count_origin
            else "vision"
            if "vision" in {existing.count_origin, item.count_origin}
            else existing.count_origin or item.count_origin
        )
        existing.confidence = min(existing.confidence, item.confidence)

    return reconciled


def run(vision: VisionPort, input_ref: VisionInput | str, locale: str, config: Config,
        idempotency_key: str, text: str | None = None) -> MealLog:
    if isinstance(input_ref, str):
        # TODO(#3): Remove VisionInput | str compatibility once live callers pass
        # image-backed VisionInput objects.
        input_ref = VisionInput(sample_id=input_ref, text=text)
    elif text is not None:
        raise TypeError("text must be part of VisionInput")

    obs.new_request_id()
    pack: LocalePack = load(locale)
    log = MealLog(idempotency_key=idempotency_key, locale=locale, config=config.name)

    with obs.stage("perception", provider=vision.name, sample=input_ref.log_reference):
        perceived = vision.perceive(input_ref)

    if not config.grounded:
        # Baseline: trust whatever the model said. No catalogue, no arithmetic
        # of our own. This row exists to be beaten.
        log.items = [
            ResolvedItem(query=p.surface_form, food_id=f"ungrounded:{p.surface_form}",
                         confidence=p.confidence,
                         nutrients=Nutrients(kcal=p.ungrounded_kcal or 0.0))
            for p in perceived
        ]
        log.totals = sum((i.nutrients for i in log.items), Nutrients()).rounded()
        log.action = "auto_accept"
        return log

    with obs.stage("normalize", locale=locale, rules=config.locale_rules):
        normalized = normalize.normalize(perceived, pack, apply_rules=config.locale_rules)

    resolved: list[ResolvedItem] = []
    for item in normalized:
        with obs.stage("retrieval", query=item.query):
            candidates = retrieval.search(item.query, pack)
        r = resolve(item.query, candidates, allow_abstain=config.gating)
        r.quantity = item.quantity
        r.unit = item.unit
        r.count_origin = item.count_origin
        resolved.append(r)

    reconciled = _reconcile_resolved(resolved)
    for item in reconciled:
        if item.abstained:
            continue

        food = pack.foods[item.food_id]
        # A missing count is not an implicit one. Keep the item on the
        # catalogue default path even when an uncounted hint names a unit.
        estimate = portion.estimate(
            food,
            item.quantity,
            item.unit if item.quantity is not None else None,
            pack,
            item.count_origin,
        )
        item.grams, item.grams_p10, item.grams_p90 = estimate
        item.portion_source = estimate.source
        item.portion_provenance = estimate.provenance
        item.nutrients = nutrition.scale_per_100g(food.per_100g, item.grams).rounded()

    log.items = reconciled
    log.totals = sum((i.nutrients for i in reconciled if not i.abstained), Nutrients()).rounded()
    if config.gating:
        log = route(log)
    else:
        log.action = "auto_accept"

    obs.event("meal_logged", config=config.name, locale=locale, action=log.action,
              items=len(reconciled), abstained=sum(i.abstained for i in reconciled),
              kcal=log.totals.kcal)
    return log


def make_vision(provider: str, api_key: str | None = None) -> VisionPort:
    if provider == "fixture":
        from mealog.adapters.vision_fixture import FixtureVision
        return FixtureVision()
    if provider == "gemini":
        from mealog.adapters.vision_gemini import GeminiVision
        return GeminiVision(api_key or "")
    raise ValueError(f"unknown vision provider: {provider}")
