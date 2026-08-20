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

from dataclasses import dataclass
from functools import cache

from sklearn.feature_extraction.text import TfidfVectorizer

from mealog.domain.models import Candidate
from mealog.locales.loader import LocalePack, load
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
    """Per-locale search structures. Built once, cached for process lifetime."""

    food_ids: list[str]
    names: list[str]
    exact: dict[str, str]           # folded surface form -> food_id
    negative: dict[str, str]        # folded confusable form -> food_id it is confused with
    word_vec: TfidfVectorizer
    char_vec: TfidfVectorizer
    word_mat: object
    char_mat: object
    word_an: object                 # analyzer, used to see n-grams transform() drops
    char_an: object


@cache
def _build(locale: str) -> _Index:
    pack = load(locale)
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
            negative[fold(form, pack)] = food_id

    # binary + norm=None + use_idf: transform() then yields the raw IDF of each
    # present n-gram, which is exactly the weight the coverage score needs.
    word_vec = TfidfVectorizer(analyzer="word", ngram_range=(1, 2),
                               binary=True, norm=None, use_idf=True)
    char_vec = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5),
                               binary=True, norm=None, use_idf=True)

    return _Index(
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
    if not query.strip():
        return []

    index = _build(pack.locale)
    scores: dict[str, float] = {}

    # 1. Exact surface hit. Unambiguous, so it outranks everything fuzzy.
    if (hit := index.exact.get(query)) is not None:
        scores[hit] = 1.0

    # 2. Blended fuzzy similarity.
    for food_id, score in zip(index.food_ids, _similarities(index, query)):
        if score >= MIN_SIGNAL:
            scores[food_id] = max(scores.get(food_id, 0.0), round(float(score), 3))

    # 3. Known confusion. Surface the food this query is a documented trap for,
    #    capped low so the user is asked rather than silently given the wrong
    #    regional match. Without this the trap returns nothing and we abstain for
    #    the wrong reason — right outcome, no understanding.
    if (confused_with := index.negative.get(query)) is not None:
        scores[confused_with] = min(scores.get(confused_with, 0.0) or CONFUSION_SCORE,
                                    CONFUSION_SCORE)

    ranked = sorted(scores.items(), key=lambda kv: (-kv[1], kv[0]))[:k]
    return [Candidate(food_id=fid, name=pack.foods[fid].name, score=round(s, 3))
            for fid, s in ranked]
