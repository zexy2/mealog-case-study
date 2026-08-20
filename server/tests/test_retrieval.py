"""Retrieval tests.

Two of these pin the specific defects documented on issue #1, so they cannot
silently come back. The rest pin properties that must survive any future swap of
the matching implementation — including the embedding model that replaces this.
"""
import pytest

from mealog.locales.loader import load
from mealog.pipeline.normalize import fold
from mealog.pipeline.resolve import MIN_ACCEPT_SCORE, resolve
from mealog.pipeline.retrieval import CONFUSION_SCORE, search


def top(query: str, locale: str) -> str | None:
    pack = load(locale)
    cands = search(fold(query, pack), pack)
    return cands[0].food_id if cands else None


# --- defect 1: inflected forms missed the catalogue entirely -----------------

@pytest.mark.parametrize("query", ["pilav", "pilavi", "pirinc pilavi", "sade pirinc pilavi"])
def test_inflected_forms_reach_the_same_canonical_food(query):
    assert top(query, "tr") == "tr.pilav"


# --- defect 2: negative_alias was loaded but never read ----------------------

def test_known_confusion_is_surfaced_and_still_asked_about():
    """The trap must be recognised, not merely missed.

    Returning nothing would also abstain, but for the wrong reason. We want the
    confusable food on the table so the user gets a specific question.
    """
    pack = load("tr")
    query = fold("baked beans", pack)
    cands = search(query, pack)

    assert "tr.kuru_fasulye" in [c.food_id for c in cands], "confusable food not surfaced"
    assert resolve(query, cands, allow_abstain=True).abstained, "accepted instead of asking"


def test_confusion_score_stays_below_the_accept_threshold():
    """Encoded as a test rather than an import so both constants stay readable
    on their own; this is the coupling between them."""
    assert CONFUSION_SCORE < MIN_ACCEPT_SCORE


# --- properties any implementation must keep --------------------------------

def test_absent_food_is_never_accepted():
    """Fuzzy matching buys recall by making everything look slightly similar.
    That must not turn an honest abstention into a confident wrong answer."""
    for locale, query in [("tr", "pizza margherita"), ("en_US", "pad thai"),
                          ("ja_JP", "lahmacun"), ("en_US", "asdfgh")]:
        pack = load(locale)
        q = fold(query, pack)
        assert resolve(q, search(q, pack), allow_abstain=True).abstained, \
            f"{locale}: '{query}' should not be accepted"


def test_same_surface_form_resolves_per_locale():
    """'rice' is a different canonical food in different markets. Locale is the
    only thing that disambiguates it, and it comes from data, not code."""
    assert top("rice", "en_US") == "us.rice_white_cooked"
    assert top("rice", "ja_JP") == "jp.rice_steamed"


def test_empty_query_returns_no_candidates():
    assert search("", load("en_US")) == []


def test_scores_are_ordered_and_bounded():
    pack = load("tr")
    cands = search(fold("mercimek", pack), pack)
    assert cands
    assert all(0.0 <= c.score <= 1.0 for c in cands)
    assert [c.score for c in cands] == sorted((c.score for c in cands), reverse=True)
