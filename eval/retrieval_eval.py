#!/usr/bin/env python3
"""Retrieval-only evaluation.

Measured separately from the end-to-end harness on purpose. The vision fixtures
are still seeded placeholders, so an end-to-end MAPE would be theatre — but
"does this surface form reach the right canonical food" is answerable today, and
it is the question this stage actually owns.

    python eval/retrieval_eval.py
    python eval/retrieval_eval.py --out eval/reports/retrieval.md
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "server" / "src"))

from mealog.domain.models import Candidate            # noqa: E402
from mealog.locales.loader import LocalePack, load    # noqa: E402
from mealog.pipeline.normalize import fold            # noqa: E402
from mealog.pipeline.resolve import resolve           # noqa: E402
from mealog.pipeline.retrieval import search          # noqa: E402

VARIANTS = REPO / "eval" / "golden" / "query_variants.jsonl"


def variant_rows() -> list[dict]:
    """Read the variant set fresh so tests and reports see the same rows."""
    return [json.loads(line) for line in VARIANTS.read_text(encoding="utf-8").splitlines()
            if line.strip()]


def is_positive(row: dict) -> bool:
    """Only ordinary expected IDs contribute to recall.

    A confusion row names the food we must surface to explain a trap, not the
    food the user actually meant. Counting it as a positive would reward the
    wrong-match behaviour this evaluation exists to catch.
    """
    return row.get("role", "positive") == "positive" and row.get("expected_food_id") is not None


def retrieval_query(row: dict, pack: LocalePack) -> str:
    """Return text at retrieval's input boundary.

    Quantity words belong to the existing normalization boundary. Variants keep
    the full user input in ``query`` and may record the already-separated
    ``retrieval_query`` so this retrieval-only test does not pretend retrieval
    parses portions itself.
    """
    return fold(row.get("retrieval_query", row["query"]), pack)


def baseline_search(query: str, pack: LocalePack, k: int = 5) -> list[Candidate]:
    """The original day-0 implementation, kept here purely as the comparison row.

    Alias containment plus Jaccard token overlap. Preserved verbatim so the
    "before" column is the real previous behaviour and not a strawman.
    """
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


class Tally:
    def __init__(self) -> None:
        self.n = self.hit1 = self.hit5 = self.accepted = 0
        self.rr = 0.0

    def add(self, expected: str, candidates: list[Candidate], query: str) -> None:
        ids = [c.food_id for c in candidates]
        self.n += 1
        if ids[:1] == [expected]:
            self.hit1 += 1
            # Ranking first is not the same as being trusted. `resolve.py` still
            # has to clear its accept threshold, and a correctly-ranked match
            # that lands below it becomes a suggestion rather than a silent log.
            # Reporting only Recall@1 hides that gap — it hid it once already.
            r = resolve(query, candidates, allow_abstain=True)
            if not r.abstained and r.food_id == expected:
                self.accepted += 1
        if expected in ids:
            self.hit5 += 1
            self.rr += 1.0 / (ids.index(expected) + 1)

    def pct(self, v: int) -> float:
        return v / self.n * 100 if self.n else 0.0

    @property
    def r1(self) -> float: return self.pct(self.hit1)
    @property
    def acc(self) -> float: return self.pct(self.accepted)
    @property
    def r5(self) -> float: return self.pct(self.hit5)
    @property
    def mrr(self) -> float: return self.rr / self.n if self.n else 0.0


def run(impl) -> tuple[Tally, dict[str, Tally], dict[str, Tally], list[str]]:
    overall = Tally()
    by_cuisine: dict[str, Tally] = defaultdict(Tally)
    by_kind: dict[str, Tally] = defaultdict(Tally)
    misses: list[str] = []

    for row in variant_rows():
        if not is_positive(row):
            continue  # absent/confusion rows have separate negative checks
        pack = load(row["locale"])
        query = retrieval_query(row, pack)
        cands = impl(query, pack)

        for t in (overall, by_cuisine[pack.cuisine_bucket], by_kind[row["kind"]]):
            t.add(row["expected_food_id"], cands, query)

        if not cands or cands[0].food_id != row["expected_food_id"]:
            got = cands[0].food_id if cands else "(nothing)"
            misses.append(f"{row['locale']:6} '{row['query']}' -> {got} "
                          f"(want {row['expected_food_id']}, kind={row['kind']})")

    return overall, dict(by_cuisine), dict(by_kind), misses


def false_accepts(impl) -> tuple[int, int, list[str]]:
    """How often food we do not carry gets *accepted* anyway.

    This is the counterweight to recall and the reason recall alone is not a
    good enough target. Fuzzy matching buys recall by making everything look a
    little similar to something; if that turns an honest abstention into a
    confident wrong answer, the trade was bad. Closed-set resolution makes a
    hallucinated *identifier* impossible — it does not make a wrong *match*
    impossible, and this is where that shows up.
    """
    total, bad, detail = 0, 0, []
    for row in variant_rows():
        if row.get("expected_food_id") is not None:
            continue
        pack = load(row["locale"])
        query = retrieval_query(row, pack)
        r = resolve(query, impl(query, pack), allow_abstain=True)
        total += 1
        forbidden = set(row.get("forbidden_food_ids", []))
        if not r.abstained or r.food_id in forbidden:
            bad += 1
            detail.append(f"{row['locale']:6} '{row['query']}' -> accepted "
                          f"{r.food_id} (conf {r.confidence}; forbidden={sorted(forbidden)})")
    return bad, total, detail


def confusion_behaviour_ok() -> list[str]:
    """A documented trap must surface the confusable food AND still abstain.

    Getting the right answer for the wrong reason (returning nothing) counts as
    a failure here — that distinction is the whole point of `negative_alias`.
    """
    problems = []
    for row in variant_rows():
        if row.get("role") != "confusion":
            continue
        pack = load(row["locale"])
        query = retrieval_query(row, pack)
        cands = search(query, pack)
        r = resolve(query, cands, allow_abstain=True)
        ids = [c.food_id for c in cands]
        expected = row.get("confusable_food_id", row.get("expected_food_id"))
        if expected not in ids:
            problems.append(f"'{row['query']}': confusable food not surfaced")
        elif not r.abstained:
            problems.append(f"'{row['query']}': accepted instead of asking")
    return problems


def report() -> str:
    base, base_cu, base_kind, _base_miss = run(baseline_search)
    new, new_cu, new_kind, new_miss = run(search)

    rows = variant_rows()
    positive_n = sum(is_positive(row) for row in rows)
    negative_n = len(rows) - positive_n
    tr_positive_n = sum(is_positive(row) and row["locale"] == "tr" for row in rows)
    L = ["# Retrieval scorecard", "",
         (f"{len(rows)} query variants ({tr_positive_n} positive Turkish inputs, "
          f"{positive_n} positive inputs overall, {negative_n} negative/confusion cases) "
          "over 3 locale packs. Measured independently of the"),
         "vision stage — see the header of `eval/retrieval_eval.py` for why.", "",
         "## Overall", "",
         "| Implementation | Recall@1 | Recall@5 | MRR | Accept@1 |",
         "|---|---:|---:|---:|---:|",
         f"| baseline (token overlap) | {base.r1:.1f}% | {base.r5:.1f}% | {base.mrr:.3f} | {base.acc:.1f}% |",
         f"| **coverage, word + char n-gram** | **{new.r1:.1f}%** | **{new.r5:.1f}%** | **{new.mrr:.3f}** | **{new.acc:.1f}%** |",
         "",
         "*Recall@1* = correct food ranked first. *Accept@1* = ranked first **and**",
         "confident enough for `resolve.py` to log it without asking. The gap between",
         "the two is the set of meals that become a one-tap suggestion instead of a",
         "silent entry — by design, not by accident.",
         "", "## Per cuisine", "",
         "| Cuisine | n | Recall@1 before | after | Δ | Accept@1 |",
         "|---|---:|---:|---:|---:|---:|"]

    for cuisine in sorted(new_cu):
        b, a = base_cu.get(cuisine, Tally()), new_cu[cuisine]
        L.append(f"| {cuisine} | {a.n} | {b.r1:.1f}% | {a.r1:.1f}% | "
                 f"{a.r1 - b.r1:+.1f} | {a.acc:.1f}% |")

    L += ["", "## Per query kind", "",
          "| Kind | n | Recall@1 before | after | Recall@5 before | after | MRR before | after |",
          "|---|---:|---:|---:|---:|---:|---:|---:|"]
    for kind in sorted(new_kind, key=lambda k: -(new_kind[k].r1 - base_kind.get(k, Tally()).r1)):
        b, a = base_kind.get(kind, Tally()), new_kind[kind]
        L.append(f"| {kind} | {a.n} | {b.r1:.1f}% | {a.r1:.1f}% | "
                 f"{b.r5:.1f}% | {a.r5:.1f}% | {b.mrr:.3f} | {a.mrr:.3f} |")

    problems = confusion_behaviour_ok()
    L += ["", "## Known-confusion behaviour", "",
          "A documented trap must surface the confusable food *and* still abstain,",
          "so the user gets a targeted question instead of a silent regional mismatch.",
          ""]
    L += ["✅ correct for all confusion cases"] if not problems else \
         [f"❌ {p}" for p in problems]

    base_bad, absent_n, _ = false_accepts(baseline_search)
    new_bad, _, new_detail = false_accepts(search)
    L += ["", "## False accepts (the counterweight to recall)", "",
          f"{absent_n} negative queries for food that is deliberately **not** a valid match.",
          "Correct behaviour is to abstain. Recall on its own is a metric you can",
          "cheat by matching more loosely, so it is only meaningful read next to this.",
          "",
          "| Implementation | False accepts | Rate |",
          "|---|---:|---:|",
          f"| baseline | {base_bad}/{absent_n} | {base_bad / absent_n * 100:.1f}% |",
          f"| **blended** | **{new_bad}/{absent_n}** | **{new_bad / absent_n * 100:.1f}%** |",
          "",
          f"Negative cases held: **{negative_n}**. Confusion rows must surface the",
          "documented wrong neighbour and still abstain; absent rows must not accept",
          "their nearest catalogue item."]
    if new_detail:
        L += ["", "```"] + new_detail + ["```"]

    if new_miss:
        L += ["", f"## Remaining Recall@1 misses ({len(new_miss)})", "", "```"]
        L += new_miss + ["```"]

    L += ["", "---", "",
          "> **Read the headline number with suspicion.** This branch evaluates the",
          "> current catalogue. The variants show whether messy surface forms reach",
          "> the closed set; they do not establish accuracy on a larger catalogue,",
          "> where near-neighbour foods compete. Re-run after catalogue growth."]

    return "\n".join(L) + "\n"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=None)
    args = ap.parse_args()
    text = report()
    if args.out:
        (REPO / args.out).write_text(text, encoding="utf-8")
        print(f"wrote {args.out}\n")
    print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
