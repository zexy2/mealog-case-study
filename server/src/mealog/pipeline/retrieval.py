"""Candidate generation over the canonical catalogue.

Two signals over the same document set, blended:

* **word-level n-grams** — carry whole-token meaning ("grilled chicken").
* **character 3–5-grams** — carry sub-token similarity, which is what actually
  absorbs inflection (`pilav` / `pilavi`), transliteration and typos. Turkish
  and Japanese make those the common case, not the edge case.

Both are scored as IDF-weighted *asymmetric coverage* rather than cosine
similarity; `_similarities` explains why that distinction mattered in practice.

Three deliberate departures from the original plan, all explained in the PR:

1. **No BM25.** Canonical food names are 2–6 tokens, so BM25's document-length
   normalisation has nothing to normalise. It would add a dependency and fix
   nothing that char n-grams do not already fix.
2. **No Reciprocal Rank Fusion.** RRF exists to merge ranked lists whose scores
   are not comparable. Both signals here are cosines in [0, 1] on the same
   documents, so a weighted blend is simpler and — more importantly — leaves a
   final score that can still be read as a confidence, which `resolve.py`
   thresholds against. RRF would have made the score uninterpretable.
3. **Coverage, not cosine.** Cosine punished short queries against foods that
   carry several aliases, which broke the accept threshold even where ranking
   was already correct.

The public signature is unchanged: `resolve.py` and the eval harness depend on it.
No locale is named anywhere in this module (decision D2, enforced in CI).
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass

from sklearn.feature_extraction.text import TfidfVectorizer

from mealog.domain.models import Candidate
from mealog.locales.loader import LocalePack
from mealog.pipeline.normalize import fold

#: Char n-grams are weighted above word matches because the failure this
#: replaces was an inflection miss, not a semantic one.
W_CHAR, W_WORD = 0.55, 0.45

#: Score handed to a known-confusion hit. It must stay *below*
#: `resolve.MIN_ACCEPT_SCORE` so the resolver abstains and the gate asks the
#: user, rather than silently accepting a food we already know is a trap.
#: `test_retrieval.py` asserts that relationship instead of importing it, so the
#: two thresholds stay independently readable.
CONFUSION_SCORE = 0.30

#: Below this share of the query accounted for, a match is noise.
MIN_SIGNAL = 0.15


@dataclass
class _Index:
    """Per-pack search structures. Built once per pack content identity."""

    food_ids: list[str]
    names: list[str]
    exact: dict[str, str]           # folded surface form -> food_id
    negative: dict[str, list[str]]  # folded form -> all food_ids it is confused with
    word_vec: TfidfVectorizer
    char_vec: TfidfVectorizer
    word_mat: object
    char_mat: object
    word_an: object                 # analyzer, used to see n-grams transform() drops
    char_an: object


_INDEX_CACHE: dict[str, _Index] = {}


def _pack_identity(pack: LocalePack) -> str:
    """Return a stable identity for every value that can affect retrieval.

    Locale names are not identities: tests and pack builders can hand us a
    changed ``LocalePack`` with the same locale. Hashing the complete pack
    keeps the cache fast for repeated calls while ensuring changed data gets a
    fresh index in the same process.
    """
    payload = {
        "locale": pack.locale,
        "cuisine_bucket": pack.cuisine_bucket,
        "nutrition_source": pack.nutrition_source,
        "license": pack.license,
        "foods": {
            food_id: pack.foods[food_id].model_dump(mode="json")
            for food_id in sorted(pack.foods)
        },
        "aliases": pack.aliases,
        "negative_aliases": pack.negative_aliases,
        "units": pack.units,
        "text_rules": pack.text_rules,
    }
    encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True,
                         separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _build(pack: LocalePack, identity: str) -> _Index:
    if cached := _INDEX_CACHE.get(identity):
        return cached

    food_ids = list(pack.foods)

    # One document per food: canonical name plus every alias. Aliases are part of
    # the document rather than a separate lookup so a partial alias match still
    # contributes signal instead of being all-or-nothing.
    docs, exact, negative = [], {}, {}
    for food_id in food_ids:
        food = pack.foods[food_id]
        surfaces = [food.name, *pack.aliases.get(food_id, [])]
        folded = [fold(s, pack) for s in surfaces]
        docs.append(" ".join(folded))
        for form in folded:
            exact.setdefault(form, food_id)
        for form in pack.negative_aliases.get(food_id, []):
            targets = negative.setdefault(fold(form, pack), [])
            if food_id not in targets:
                targets.append(food_id)

    # binary + norm=None + use_idf: transform() then yields the raw IDF of each
    # present n-gram, which is exactly the weight the coverage score needs.
    word_vec = TfidfVectorizer(analyzer="word", ngram_range=(1, 2),
                               binary=True, norm=None, use_idf=True)
    char_vec = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5),
                               binary=True, norm=None, use_idf=True)

    index = _Index(
        food_ids=food_ids,
        names=[pack.foods[f].name for f in food_ids],
        exact=exact,
        negative=negative,
        word_vec=word_vec,
        char_vec=char_vec,
        word_mat=word_vec.fit_transform(docs),
        char_mat=char_vec.fit_transform(docs),
        word_an=word_vec.build_analyzer(),
        char_an=char_vec.build_analyzer(),
    )
    _INDEX_CACHE[identity] = index
    return index


def _negative_matches(index: _Index, query: str) -> list[str]:
    """Return all confusion targets whose negative alias occupies whole tokens.

    A larger catalogue can expose several plausible neighbours for one surface
    form. Cap every documented target, or another candidate can still clear the
    resolver threshold after the first target is capped.
    """
    query_tokens = query.split()
    matches: list[str] = []
    for alias, food_ids in index.negative.items():
        alias_tokens = alias.split()
        width = len(alias_tokens)
        if width and any(query_tokens[i:i + width] == alias_tokens
                         for i in range(len(query_tokens) - width + 1)):
            for food_id in food_ids:
                if food_id not in matches:
                    matches.append(food_id)
    return matches


def _similarities(index: _Index, query: str) -> list[float]:
    """IDF-weighted asymmetric coverage: *how much of what the user said is
    accounted for by this food's surface forms*, weighted by how distinctive
    each piece is.

    Cosine was the obvious choice and the wrong one. It is symmetric, so a short
    query against a document holding a canonical name plus several aliases is
    penalised for everything the document contains that the query did not say —
    `pilav` scored 0.28 against `sade pirinc pilavi` purely because the document
    was longer. Ranking survived that; the absolute score did not, and
    `resolve.py` thresholds on the absolute score.

    Coverage has the semantics we actually want: an unambiguous partial name
    scores high, and a query the catalogue cannot account for scores low. When a
    short query covers several foods equally, they all score high and the
    resolver's margin rule turns that into a question — which is correct, that
    is genuine ambiguity rather than low similarity.
    """
    scores = []
    for vec, mat, analyzer, weight in (
        (index.word_vec, index.word_mat, index.word_an, W_WORD),
        (index.char_vec, index.char_mat, index.char_an, W_CHAR),
    ):
        q = vec.transform([query])

        # `transform` silently drops n-grams the catalogue has never seen, so the
        # denominator must add them back. Without this, coverage is computed only
        # over the parts of the query the catalogue already recognises and an
        # entirely foreign dish can score 1.0 — "pizza margherita" matched a
        # Turkish rice dish at 0.55 before this correction, because every n-gram
        # that made it *pizza* had been discarded. Unseen n-grams are maximally
        # distinctive, so they are charged at the highest IDF in the index.
        unseen = sum(1 for g in set(analyzer(query)) if g not in vec.vocabulary_)
        total = q.sum() + unseen * float(vec.idf_.max())

        if total == 0:
            scores.append([0.0] * len(index.food_ids))
            continue
        covered = (mat > 0).astype(float) @ q.T
        scores.append((covered.toarray().ravel() / total * weight).tolist())

    return [a + b for a, b in zip(*scores)]


def search(query: str, pack: LocalePack, k: int = 5) -> list[Candidate]:
    """Return up to `k` canonical candidates for a normalized query string.

    An empty list is a valid, meaningful answer: it makes the resolver abstain,
    which is the correct behaviour for food we do not carry.
    """
    query = fold(query, pack)
    if not query:
        return []

    index = _build(pack, _pack_identity(pack))
    scores: dict[str, float] = {}

    # 1. Exact surface hit. Unambiguous, so it outranks everything fuzzy.
    exact_hit = index.exact.get(query)
    if exact_hit is not None:
        scores[exact_hit] = 1.0

    # 2. Blended fuzzy similarity.
    for food_id, score in zip(index.food_ids, _similarities(index, query)):
        if score >= MIN_SIGNAL:
            scores[food_id] = max(scores.get(food_id, 0.0), round(float(score), 3))

    # 3. Known confusion. Surface every food this query is a documented trap
    #    for, capped low so the user is asked rather than silently given the wrong
    #    regional match. Without this the trap returns nothing and we abstain for
    #    the wrong reason — right outcome, no understanding. Multiple caps matter
    #    when a larger catalogue exposes more than one plausible neighbour.
    for confused_with in _negative_matches(index, query):
        # A generic negative alias may be a token-bounded subphrase of a more
        # specific positive alias ("yogurt" inside "yogurt icecegi"). Preserve
        # the exact positive surface hit; it is stronger evidence than the
        # generic confusion note.
        if confused_with == exact_hit:
            continue
        scores[confused_with] = CONFUSION_SCORE

    ranked = sorted(scores.items(), key=lambda kv: (-kv[1], kv[0]))[:k]
    return [Candidate(food_id=fid, name=pack.foods[fid].name, score=round(s, 3))
            for fid, s in ranked]
