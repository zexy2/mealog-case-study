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


def run(vision: VisionPort, input_ref: VisionInput | str, locale: str, config: Config,
        idempotency_key: str, text: str | None = None) -> MealLog:
    if isinstance(input_ref, str):
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
        if not r.abstained:
            food = pack.foods[r.food_id]
            r.grams, r.grams_p10, r.grams_p90 = portion.estimate(
                food, item.quantity, item.unit, pack)
            r.nutrients = nutrition.scale_per_100g(food.per_100g, r.grams).rounded()
        resolved.append(r)

    log.items = resolved
    log.totals = sum((i.nutrients for i in resolved if not i.abstained), Nutrients()).rounded()
    if config.gating:
        log = route(log)
    else:
        log.action = "auto_accept"

    obs.event("meal_logged", config=config.name, locale=locale, action=log.action,
              items=len(resolved), abstained=sum(i.abstained for i in resolved),
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
