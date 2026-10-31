#!/usr/bin/env python3
"""Guard the licence boundary of the Turkish locale pack.

`locale_packs/tr/` holds rows derived from TürKomp, which permits conditioned
noncommercial sharing and requires a separate agreement for commercial use. The
repository's MIT licence deliberately excludes it (see `docs/licensing.md`).

Git makes that boundary easy to break by accident: a `git rm` commits the
deletion *and* reloads the data, a merge can reintroduce it, and an export can
ship the whole tree. This check fails when the tracked tree contains the
restricted rows in a state that makes the dataset reconstructable — i.e. when
their nutrient payload is present. It is a licence guard, not a privacy guard:
it does not decide whether reuse is legal, only whether the repository still
carries the data that the MIT grant must not appear to cover.

    python scripts/check_licence_boundary.py            # check the tree
    python scripts/check_licence_boundary.py --staged   # check what would be committed

Exit code 0 means the boundary holds. Exit code 1 means it does not, and names
the file and the first offending row so the fix is obvious.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "locale_packs/tr"
RESTRICTED = ("foods.jsonl", "aliases.jsonl", "units.jsonl")
NUTRIENT_KEYS = ("per_100g", "kcal", "protein_g", "carb_g", "fat_g")
REMEDIATION = (
    "The Turkish pack is restricted-noncommercial (docs/licensing.md).\n"
    "Remove the extracted rows from the tracked tree and ship this pack as a\n"
    "local, licence-gated download instead. Deleting the file is not enough: the\n"
    "deleted blob stays reachable in the history. Do not weaken this check to\n"
    "make CI pass."
)


def _tracked(path: Path) -> bool:
    try:
        result = subprocess.run(
            ["git", "ls-files", "--error-unmatch", "--", str(path.relative_to(ROOT))],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
    except OSError:
        return False
    return result.returncode == 0


def _carries_nutrition(line: str) -> bool:
    try:
        row = json.loads(line)
    except json.JSONDecodeError:
        return False
    return isinstance(row, dict) and any(key in row for key in NUTRIENT_KEYS)


def _pack_declares_restricted_terms() -> bool:
    """The pack metadata is the machine-readable half of the licence boundary."""
    manifest = PACK / "pack.yaml"
    if not manifest.exists():
        return False
    text = manifest.read_text(encoding="utf-8")
    return "restricted-noncommercial" in text


def _nutrient_payloads(staged: bool) -> list[str]:
    failures: list[str] = []
    for name in RESTRICTED:
        path = PACK / name
        if not path.exists():
            continue
        if not staged and not _tracked(path):
            continue
        relative = path.relative_to(ROOT)
        for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if line.strip() and _carries_nutrition(line):
                failures.append(f"{relative}:{number} carries restricted nutrient data")
                break
    return failures


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--staged",
        action="store_true",
        help="check the working tree even if the files are not tracked yet",
    )
    args = parser.parse_args(argv)

    if not _pack_declares_restricted_terms():
        print(
            "licence boundary violated: locale_packs/tr/pack.yaml no longer declares\n"
            "restricted-noncommercial terms. The metadata is part of the boundary;\n"
            "restoring it is cheaper than arguing about it later.",
            file=sys.stderr,
        )
        return 1

    failures = _nutrient_payloads(staged=args.staged)
    if not failures:
        print("licence boundary holds: no restricted nutrient payload is tracked")
        return 0

    print("licence boundary violated:", file=sys.stderr)
    for failure in failures:
        print(f"  {failure}", file=sys.stderr)
    print(file=sys.stderr)
    print(REMEDIATION, file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
