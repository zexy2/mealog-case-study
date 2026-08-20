"""Build a locale pack from a food-composition source.

Adding a market should be a documented command, not a project. This script is
small on purpose: it validates and emits the five pack files, and refuses to
write a pack that would break the loader's invariants.

    python scripts/build_locale_pack.py --locale es_MX --cuisine latin_american \
        --source "USDA FDC" --license "public-domain" --foods raw/es_MX.csv

CSV columns: food_id,name,kcal,protein_g,carb_g,fat_g,default_serving_g,default_serving_name
"""
from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VALID_BUCKETS = {"western", "mediterranean", "east_asian",
                 "south_asian", "latin_american", "other_mixed"}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--locale", required=True)
    ap.add_argument("--cuisine", required=True, choices=sorted(VALID_BUCKETS))
    ap.add_argument("--source", required=True, help="nutrition data provenance")
    ap.add_argument("--license", required=True, help="usage terms; blocks legal surprises later")
    ap.add_argument("--foods", required=True, type=Path)
    args = ap.parse_args()

    out = ROOT / "locale_packs" / args.locale
    out.mkdir(parents=True, exist_ok=True)

    rows = list(csv.DictReader(args.foods.open(encoding="utf-8")))
    if not rows:
        raise SystemExit("no rows in --foods")

    ids = [r["food_id"] for r in rows]
    if len(ids) != len(set(ids)):
        raise SystemExit("duplicate food_id in source")
    prefix = args.locale.split("_")[0] + "."
    if bad := [i for i in ids if not i.startswith(prefix)]:
        print(f"warning: {len(bad)} ids are not namespaced by locale, e.g. {bad[0]}")

    with (out / "foods.jsonl").open("w", encoding="utf-8") as fh:
        for r in rows:
            fh.write(json.dumps({
                "food_id": r["food_id"], "name": r["name"],
                "per_100g": {k: float(r[k]) for k in ("kcal", "protein_g", "carb_g", "fat_g")},
                "default_serving_g": float(r["default_serving_g"]),
                "default_serving_name": r["default_serving_name"],
                "source": args.source,
            }, ensure_ascii=False) + "\n")

    for name in ("aliases.jsonl", "units.jsonl"):
        (out / name).touch()
    (out / "text_rules.yaml").write_text("lowercase: true\nstrip_accents: false\n", encoding="utf-8")
    (out / "pack.yaml").write_text(
        f"locale: {args.locale}\ncuisine_bucket: {args.cuisine}\n"
        f"nutrition_source: {args.source}\nlicense: {args.license}\n"
        f"food_count: {len(rows)}\n", encoding="utf-8")

    print(f"wrote {len(rows)} foods to {out}")
    print("next: populate aliases.jsonl + units.jsonl, add golden samples, run `make eval`")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
