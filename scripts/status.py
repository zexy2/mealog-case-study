#!/usr/bin/env python3
"""Generate STATUS.md by probing the repository.

A hand-written status file drifts, and a drifted status file is just a false
claim with extra steps — this repository has already shipped two of those today
(a fine-tuning doc headed "Implemented", a PR body claiming no new
dependencies). So status is derived from the working tree, not asserted, and CI
fails if the committed file disagrees with what the probes find.

    python scripts/status.py            # regenerate STATUS.md
    python scripts/status.py --check    # fail if STATUS.md is stale
"""
from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

DONE, PARTIAL, TODO = "✅ working", "🚧 partial", "⬜ not started"


@dataclass
class Probe:
    label: str
    state: str
    evidence: str


def probe_mobile() -> Probe:
    found = [p for p in ROOT.glob("**/package.json") if "node_modules" not in str(p)]
    if not found:
        return Probe("Mobile app experience (not a web app)", TODO,
                     "no app project in the tree")
    return Probe("Mobile app experience (not a web app)", PARTIAL,
                 f"{len(found)} package.json found")


def probe_vision() -> Probe:
    src = (ROOT / "server/src/mealog/adapters/vision_gemini.py").read_text(encoding="utf-8")
    if "NotImplementedError" in src:
        return Probe("Real vision provider", TODO,
                     "`vision_gemini.perceive()` raises NotImplementedError — "
                     "[#3](../../issues/3)")
    return Probe("Real vision provider", DONE, "provider wired")


def probe_photo_ingest() -> Probe:
    src = (ROOT / "server/src/mealog/api/main.py").read_text(encoding="utf-8")
    if "UploadFile" in src or "image_url" in src:
        return Probe("Photo ingest (end-to-end flow)", DONE, "API accepts an image")
    return Probe("Photo ingest (end-to-end flow)", PARTIAL,
                 "API accepts `sample_id` (a fixture id), not a photograph — "
                 "[#6](../../issues/6)")


def probe_golden() -> tuple[Probe, int, int, int]:
    manifest = ROOT / "eval/golden/manifest.jsonl"
    rows = [json.loads(x) for x in manifest.read_text(encoding="utf-8").splitlines() if x.strip()]
    fixtures = list((ROOT / "eval/fixtures").glob("*.json"))
    synthetic = sum(1 for f in fixtures
                    if json.loads(f.read_text(encoding="utf-8")).get("_synthetic"))
    state = DONE if (len(rows) >= 60 and synthetic == 0) else PARTIAL
    note = (f"harness runs offline; {len(rows)} golden samples, "
            f"{synthetic}/{len(fixtures)} fixtures still synthetic")
    if synthetic:
        note += " — [#3](../../issues/3), [#2](../../issues/2)"
    return (Probe("Accuracy evaluation (metrics, test set, taxonomy)", state, note),
            len(rows), synthetic, len(fixtures))


def probe_finetune() -> Probe:
    scripts = list(ROOT.glob("**/train_*.py")) + list(ROOT.glob("**/*finetune*.py"))
    weights = list(ROOT.glob("**/*.safetensors"))
    if scripts or weights:
        return Probe("Fine-tuning", PARTIAL,
                     f"{len(scripts)} script(s), {len(weights)} artifact(s)")
    return Probe("Fine-tuning", PARTIAL,
                 "plan in `docs/finetuning-plan.md`; nothing trained "
                 "(the brief marks implementation optional)")


def probe_writeup() -> Probe:
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    pending = len(re.findall(r"TODO\(", readme))
    docs = len(list((ROOT / "docs").glob("*.md")))
    state = DONE if pending == 0 else PARTIAL
    return Probe("Technical write-up", state,
                 f"README + {docs} documents; {pending} section group(s) still TODO")


def counts() -> dict:
    tests = sum(len(re.findall(r"^def test_", p.read_text(encoding="utf-8"), re.M))
                for p in (ROOT / "server/tests").glob("test_*.py"))
    packs = sorted(p.name for p in (ROOT / "locale_packs").iterdir()
                   if (p / "pack.yaml").exists())
    foods = sum(len([x for x in (ROOT / "locale_packs" / p / "foods.jsonl")
                     .read_text(encoding="utf-8").splitlines() if x.strip()]) for p in packs)
    return {"tests": tests, "packs": packs, "foods": foods}


def render() -> str:
    golden, n_golden, n_synth, n_fix = probe_golden()
    probes = [
        probe_mobile(), probe_photo_ingest(), probe_vision(), golden,
        probe_finetune(), probe_writeup(),
        Probe("Loom walkthrough", TODO, "recorded after code freeze"),
        Probe("Email summary", TODO, "sent with the submission"),
    ]
    c = counts()
    outstanding = sum(1 for p in probes if p.state != DONE)

    L = [
        "# Status",
        "",
        "> **Generated file — do not edit.** Produced by `python scripts/status.py`",
        "> from the working tree, and checked in CI. It cannot quietly go stale the",
        "> way a hand-written status section does.",
        "",
        "## Is this ready to submit?",
        "",
        f"**{'Yes.' if outstanding == 0 else 'No.'}** "
        f"{outstanding} of {len(probes)} deliverables are still outstanding. "
        "What exists today is the measurement layer and the architecture; the "
        "photo path and the app do not exist yet.",
        "",
        "## Deliverables",
        "",
        "| Deliverable | State | Evidence |",
        "|---|---|---|",
    ]
    L += [f"| {p.label} | {p.state} | {p.evidence} |" for p in probes]

    if n_synth:
        L += ["", "## Read the numbers with this in mind", "",
              f"**{n_synth} of {n_fix} recorded fixtures are seeded placeholders**, "
              'flagged in each file with `"_synthetic": true`.',
              "",
              "Nothing in `eval/reports/` is yet a claim about how accurately this",
              "system reads a real plate. The harness, the metrics and the per-cuisine",
              "breakdown are real and reproducible; the inputs they run on are not.",
              "That changes when [#3](../../issues/3) records real provider responses",
              "and [#2](../../issues/2) grows the golden set."]

    L += ["", "## Measured", "",
          "| | |", "|---|---:|",
          f"| Test functions | {c['tests']} |",
          f"| Locale packs | {len(c['packs'])} ({', '.join(c['packs'])}) |",
          f"| Canonical foods | {c['foods']} |",
          f"| Golden-set samples | {n_golden} |",
          "",
          "## Order of work",
          "",
          "1. [#6](../../issues/6) API photo contract — **before** the mobile client,",
          "   so the client is never written against a shape that has to change",
          "2. [#3](../../issues/3) real vision provider, recording real fixtures",
          "3. [#2](../../issues/2) grow the golden set → the first honest scorecard",
          "4. [#7](../../issues/7) portion density, and [#5](../../issues/5) confidence",
          "   accounting for portion uncertainty",
          "5. Mobile screens",
          "6. Write-up, walkthrough, submission",
          "",
          "[#8](../../issues/8) (restricted-licence enforcement) is real, and is the",
          "first item cut if the schedule slips.",
          ""]
    return "\n".join(L)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()

    target = ROOT / "STATUS.md"
    fresh = render()

    if args.check:
        current = target.read_text(encoding="utf-8") if target.exists() else ""
        if current != fresh:
            print("STATUS.md is stale. Run `python scripts/status.py` and commit the "
                  "result.\nThe repository and its status file disagree — which is "
                  "the drift this check exists to prevent.")
            return 1
        print("STATUS.md matches the repository")
        return 0

    target.write_text(fresh, encoding="utf-8")
    print(f"wrote {target.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
