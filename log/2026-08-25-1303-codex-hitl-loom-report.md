# Session log — claim #369

- Handle: `codex`
- Branch: `agent/codex/comparison-photo-evidence`
- Base before this follow-up: `292613d0fb94f5ed50f921150f97b7e447423c48`
- Scope widened before editing: `docs/comparison.md`, `docs/hitl_data_flywheel_loom_presentation_report.html`

## Work completed

- Added a self-contained English evidence brief at
  `docs/hitl_data_flywheel_loom_presentation_report.html`.
- Omitted the former Turkish “Loom Sunumu Konuşma Metni (Speech Script)” section
  at the user's direction.
- Replaced the deleted historical presentation's unsupported claims with explicit
  shipped/tested/proposed/not-trained boundaries.
- Documented the active metadata/PII boundary, the standalone (not live JPEG)
  face-blurring utility, item-scoped review, process-local telemetry prototype,
  proposed human-gated data path, and absent training evidence.
- Linked the report from `docs/comparison.md` and kept EatBetter claims bounded to
  observed public surfaces.
- Restored no screenshots, user photos, or deleted `docs/loom_assets` binaries.

## Verification

- `make check`: passed in `/tmp/mealog-comparison-check-venv` — Ruff clean, 287
  tests passed, architectural invariants hold, `STATUS.md` matches, and V3
  regression guard passed.
- `git diff --check`: passed.
- Local HTML link scan: all 9 repository-relative links resolved; the report
  intentionally contains no image or external asset dependency.

## Traps

The old HTML existed in Git history but was deleted because it contained stale
claims about active-learning promotion, staging photos, automatic face masking,
telemetry counts, and automatic FT-1/catalogue updates. Do not restore it or
turn the proposed flywheel into a shipped feature. A tested RGBA face utility is
not evidence that the compressed live provider path blurs faces.
