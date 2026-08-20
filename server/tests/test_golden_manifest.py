import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SHA256 = re.compile(r"^[0-9a-f]{64}$")


def _rows() -> list[dict]:
    return [
        json.loads(line)
        for line in (ROOT / "eval/golden/manifest.jsonl").read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]


def test_non_text_golden_entries_declare_reproducible_image_sources() -> None:
    rows = [row for row in _rows() if row["input_type"] != "text"]
    assert rows
    for row in rows:
        assert row["image_source_url"].startswith(("http://", "https://"))
        assert row["image_license"].strip()
        assert SHA256.fullmatch(row["image_sha256"])


def test_seeded_truth_never_claims_tier_one() -> None:
    for row in _rows():
        assert not (row["tier"] == "tier_1" and row.get("truth_source") == "seeded")
