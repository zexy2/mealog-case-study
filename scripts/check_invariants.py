#!/usr/bin/env python3
"""Architectural invariants, enforced.

AGENTS.md §9 lists the rules that keep this codebase coherent when several agents
edit it in parallel. Rules that live only in prose get broken; these are checked in
CI so a violating PR fails instead of silently eroding the design.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "server" / "src" / "mealog"
PACKS = ROOT / "locale_packs"

failures: list[str] = []


def fail(rule: str, detail: str) -> None:
    failures.append(f"[{rule}] {detail}")


def check_nutrition_is_the_only_producer() -> None:
    """D1: nutrient arithmetic lives in exactly one module."""
    allowed = {SRC / "pipeline" / "nutrition.py", SRC / "domain" / "models.py"}
    pattern = re.compile(r"per_100g\s*\.\s*kcal|kcal\s*\*|\*\s*per_100g")
    for path in SRC.rglob("*.py"):
        if path in allowed:
            continue
        for i, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if pattern.search(line):
                fail("D1", f"{path.relative_to(ROOT)}:{i} computes nutrients "
                           f"outside nutrition.py")


def check_no_locale_literals() -> None:
    """D2: a market is data. Pipeline and domain code must not name one."""
    locales = [p.name for p in PACKS.iterdir() if (p / "pack.yaml").exists()]
    pattern = re.compile("|".join(rf"""["']{re.escape(loc)}["']""" for loc in locales))
    for area in ("pipeline", "domain"):
        for path in (SRC / area).rglob("*.py"):
            for i, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
                if pattern.search(line) and "noqa: locale" not in line:
                    fail("D2", f"{path.relative_to(ROOT)}:{i} hardcodes a locale name")


def check_packs_declare_license() -> None:
    """D2: packs carry different legal terms; provenance is not optional."""
    for pack in sorted(PACKS.iterdir()):
        meta = pack / "pack.yaml"
        if not meta.exists():
            continue
        text = meta.read_text(encoding="utf-8")
        for field in ("license:", "nutrition_source:", "cuisine_bucket:"):
            if field not in text:
                fail("D2", f"{pack.name}/pack.yaml missing '{field}'")


def check_every_golden_sample_has_a_fixture() -> None:
    """D4: `make eval` must run for anyone, with no key and no network."""
    manifest = ROOT / "eval" / "golden" / "manifest.jsonl"
    fixtures = ROOT / "eval" / "fixtures"
    for line in manifest.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        sid = json.loads(line)["sample_id"]
        if not (fixtures / f"{sid}.json").exists():
            fail("D4", f"golden sample '{sid}' has no recorded fixture")


def check_resolver_is_closed_set() -> None:
    """The anti-hallucination guarantee must stay structural."""
    text = (SRC / "pipeline" / "resolve.py").read_text(encoding="utf-8")
    if "ABSTAIN" not in text:
        fail("closed-set", "resolve.py no longer references ABSTAIN")
    if "candidates" not in text:
        fail("closed-set", "resolve.py no longer constrains output to candidates")


def main() -> int:
    for check in (check_nutrition_is_the_only_producer,
                  check_no_locale_literals,
                  check_packs_declare_license,
                  check_every_golden_sample_has_a_fixture,
                  check_resolver_is_closed_set):
        check()

    if failures:
        print(f"{len(failures)} invariant violation(s):\n")
        for f in failures:
            print(f"  {f}")
        print("\nSee AGENTS.md section 9. Do not weaken an invariant to pass CI;")
        print("if it is genuinely wrong, change it in its own PR with a rationale.")
        return 1

    print("all architectural invariants hold")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
