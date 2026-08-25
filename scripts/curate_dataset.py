#!/usr/bin/env python3
"""Prepare privacy-minimized telemetry for human review.

Reads local telemetry event logs, verifies selected food IDs against a locale
pack, and emits candidate records. These outputs are not labels, training sets,
or approved catalogue changes. A human must review them before any later use.

Usage:
  python3 scripts/curate_dataset.py --input data/telemetry/events.jsonl --out-dir data/curated --report
"""

import argparse
import json
from collections import Counter, defaultdict
from contextlib import suppress
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def load_canonical_foods(locale: str = "tr") -> set[str]:
    """Load valid canonical food IDs from the locale pack."""
    foods_file = ROOT / "locale_packs" / locale / "foods.jsonl"
    if not foods_file.exists():
        return set()
    valid_ids = set()
    with open(foods_file, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                with suppress(json.JSONDecodeError, KeyError, TypeError):
                    data = json.loads(line)
                    valid_ids.add(data["food_id"])
    return valid_ids


def curate_events(events_path: Path, out_dir: Path, locale: str = "tr") -> dict:
    """Prepare telemetry events as human-review candidates."""
    if not events_path.is_file():
        raise FileNotFoundError(f"telemetry input does not exist: {events_path}")

    valid_food_ids = load_canonical_foods(locale)
    if not valid_food_ids:
        raise ValueError(f"locale pack has no canonical foods: {locale}")

    out_dir.mkdir(parents=True, exist_ok=True)
    ft2_path = out_dir / "ft2_vision_alignment.jsonl"
    ft1_path = out_dir / "ft1_portion_regression.jsonl"
    aliases_path = out_dir / "discovered_aliases.jsonl"

    stats = {
        "total_events": 0,
        "valid_events": 0,
        "swaps": 0,
        "portion_adjustments": 0,
        "discovered_queries": 0,
        "confusion_pairs": Counter(),
    }

    ft2_rows = []
    ft1_rows = []
    discovered_aliases = defaultdict(int)

    with open(events_path, "r", encoding="utf-8") as f:
        for line_number, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                event = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"invalid JSON on telemetry line {line_number}") from exc

            request_hash = event.get("request_hash")
            if not isinstance(request_hash, str) or len(request_hash) != 64:
                raise ValueError(f"missing or invalid request_hash on telemetry line {line_number}")

            stats["total_events"] += 1
            items = event.get("items", [])
            if not items:
                continue

            stats["valid_events"] += 1

            for it in items:
                pred_id = it.get("predicted_food_id")
                sel_id = it.get("selected_food_id")
                query = it.get("original_query", "").strip()
                pred_g = it.get("predicted_grams")
                sel_g = it.get("selected_grams")

                # 1. Candidate Swap (Hard Negative Mining for FT-2)
                if pred_id and sel_id and pred_id != sel_id and sel_id in valid_food_ids:
                    stats["swaps"] += 1
                    stats["confusion_pairs"][(pred_id, sel_id)] += 1
                    ft2_rows.append(
                        {
                            "request_hash": request_hash,
                            "positive_food_id": sel_id,
                            "hard_negative_food_id": pred_id,
                            "query": query,
                            "weight": 1.5,
                        }
                    )

                # 2. Portion Adjustment (Quantile Target for FT-1)
                if sel_id and sel_g and pred_g and sel_g != pred_g and sel_id in valid_food_ids:
                    stats["portion_adjustments"] += 1
                    ft1_rows.append(
                        {
                            "request_hash": request_hash,
                            "food_id": sel_id,
                            "baseline_grams": pred_g,
                            "target_grams": sel_g,
                            "ratio": round(sel_g / pred_g, 3),
                        }
                    )

                # 3. Discovered Aliases / Out-of-Distribution Vocabulary
                if query and (pred_id == "ABSTAIN" or sel_id == "USER_CUSTOM"):
                    discovered_aliases[query.lower()] += 1
                    stats["discovered_queries"] += 1

    # Write FT-2 Dataset
    with open(ft2_path, "w", encoding="utf-8") as f:
        f.writelines(json.dumps(row, ensure_ascii=False) + "\n" for row in ft2_rows)

    # Write FT-1 Dataset
    with open(ft1_path, "w", encoding="utf-8") as f:
        f.writelines(json.dumps(row, ensure_ascii=False) + "\n" for row in ft1_rows)

    # Write Discovered Aliases
    with open(aliases_path, "w", encoding="utf-8") as f:
        aliases = sorted(discovered_aliases.items(), key=lambda x: x[1], reverse=True)
        f.writelines(
            json.dumps({"query": query, "frequency": count}, ensure_ascii=False) + "\n"
            for query, count in aliases
        )

    return stats


def print_report(stats: dict):
    print("=" * 60)
    print("MEALOG TELEMETRY HUMAN-REVIEW CANDIDATES")
    print("=" * 60)
    print(f"Total Telemetry Events Logged : {stats['total_events']}")
    print(f"Valid Structured Events       : {stats['valid_events']}")
    print(f"Hard Negative Swaps (FT-2)    : {stats['swaps']}")
    print(f"Portion Adjustments (FT-1)    : {stats['portion_adjustments']}")
    print(f"Discovered Query Slang        : {stats['discovered_queries']}")
    print("-" * 60)
    print("Top confused candidate pairs (model predicted, user selected):")
    if stats["confusion_pairs"]:
        for (pred, sel), count in stats["confusion_pairs"].most_common(5):
            print(f"  {pred} -> {sel} ({count} times)")
    else:
        print("  (No confusion pairs yet)")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="Prepare Mealog telemetry for human review")
    parser.add_argument(
        "--input",
        type=Path,
        default=ROOT / "data" / "telemetry" / "events.jsonl",
        help="Path to telemetry events.jsonl",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=ROOT / "data" / "curated",
        help="Output directory for review candidates",
    )
    parser.add_argument("--locale", type=str, default="tr", help="Locale code")
    parser.add_argument("--report", action="store_true", help="Print report to console")

    args = parser.parse_args()
    stats = curate_events(args.input, args.out_dir, args.locale)

    if args.report:
        print_report(stats)


if __name__ == "__main__":
    main()
