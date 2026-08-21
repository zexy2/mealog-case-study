# Rebased live fixture handoff

Handle: `codex`
Issue: #3
Base: `origin/main` at `82a25932` (includes requested `d173886` plus #67)

## State

Rebased live-recording work onto current main. Kept #66's Gemini degradation
ladder and applied exact model configuration, 4-second pacing, model-stamped
fixtures, idempotent recording, and baseline update. Existing recorded JSON
files were preserved as complete files; no fixture JSON was hand-merged.

`python scripts/status.py` reports `Real vision provider | ✅ working | 9
recorded non-synthetic provider response(s)`.

## Recorded runs

| Model | Recorded | Requests | Wall time | Cost | Result |
|---|---:|---:|---:|---:|---|
| `gemini-flash-lite-latest` | 9/9 | 9 | 35.54s | $0.00 | complete |
| `gemini-flash-latest` | 3/9 | 6 attempts across 3 runs | ~74s | $0.00 | stopped after repeated HTTP 503 high-demand responses at `tr_0001` |

Full-Flash fixtures present: `n5k_0001`, `n5k_0002`, `pkg_0001`. Six remain
missing. No second provider run was possible after rebase because credential is
not present in this shell; recorder idempotency would skip existing matching
sample/model/prompt rows.

## Scorecard delta

Current main, with sourced labels and seeded fixtures, versus this branch's
real Lite fixtures:

| Config | Main V3 scorecard | Live-fixture scorecard |
|---|---:|---:|
| V0 worst MAPE | 30.5% | 100.0% |
| V1 worst MAPE / coverage / F1 | 9.7% / 100% / 0.67 | 12.7% / 67% / 0.86 |
| V2 worst MAPE / coverage / F1 | 46.1% / 100% / 0.67 | 229.5% / 67% / 0.86 |
| V3 worst MAPE / coverage / F1 | 46.1% / 78% / 0.70 | 229.5% / 56% / 0.86 |

The V3 regression baseline is updated from `56.60` to `229.49` for western;
other cuisine buckets remain `0.00`. This is an explicit honest-baseline
reset for live fixtures, not threshold tuning.

## Verification

`make check` passes: Ruff, 85 tests, invariants, generated status check, and
per-cuisine regression. No API key is in repo artifacts.

## Traps

Do not force-push rebased history; publish from a new branch. Do not claim
9/9 Full-Flash: six fixtures remain absent because Gemini returned HTTP 503.
Do not hand-edit fixture JSON or hide the changed scorecard behind the old
baseline.
