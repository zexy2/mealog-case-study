"""Candidate generation over the canonical catalogue.

Day-0 implementation is lexical (alias hit + token overlap). Friday it gains
BM25 + a fine-tuned bi-encoder fused with RRF. The interface below is what the
resolver and the eval harness depend on, so that swap is invisible to them.
"""
from mealog.domain.models import Candidate
from mealog.locales.loader import LocalePack
from mealog.pipeline.normalize import fold


def search(query: str, pack: LocalePack, k: int = 5) -> list[Candidate]:
    q_tokens = set(query.split())
    scored: dict[str, float] = {}

    for food_id, aliases in pack.aliases.items():
        for alias in aliases:
            a = fold(alias, pack)
            if a == query:
                scored[food_id] = max(scored.get(food_id, 0.0), 1.0)
            elif a in query or query in a:
                scored[food_id] = max(scored.get(food_id, 0.0), 0.75)

    for food_id, food in pack.foods.items():
        name_tokens = set(fold(food.name, pack).split())
        if not name_tokens:
            continue
        overlap = len(q_tokens & name_tokens) / len(q_tokens | name_tokens)
        if overlap > 0:
            scored[food_id] = max(scored.get(food_id, 0.0), overlap)

    ranked = sorted(scored.items(), key=lambda kv: -kv[1])[:k]
    return [Candidate(food_id=fid, name=pack.foods[fid].name, score=round(s, 3))
            for fid, s in ranked if fid in pack.foods]
