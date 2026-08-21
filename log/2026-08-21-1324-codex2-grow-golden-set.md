# Golden-set growth completion

Agent: codex2
Issue: #2
Claim: #82
Branch: `agent/codex2/grow-golden-set`

## Change

The golden manifest grew from 9 to 25 rows. Sixteen new rows use official
Nutrition5k overhead RGB images and dish metadata, with CC BY 4.0, verified
SHA-256 values, exact catalogue mappings, scale-weighed grams, and
`dataset=Nutrition5k; record_id=...; field=...` provenance. The new rows cover
all six evaluator cuisine buckets: western 6, Mediterranean 6, East Asian 5,
South Asian 3, Latin American 3, and other mixed 2. Because Nutrition5k does
not publish cuisine, each new row discloses its evaluator-bucket inference in
`cuisine_provenance`.

All 25 samples have non-synthetic fixtures. The recorder ran with
`gemini-flash-lite-latest` and a 4-second request interval: 16 recorded, 9
idempotently skipped, 16 provider requests, 62.03 seconds elapsed. The
credential was process-only and is not present in any file, fixture, log, or
commit.

## Evaluation evidence

Reference (9 rows at `origin/main`) -> new set (25 rows), offline V3:

| metric | before | after |
|---|---:|---:|
| coverage | 56% | 20% |
| item F1 | 0.86 | 0.47 |
| kcal MAPE | 229.5% | 229.5% |
| FP rate | 18.2% | 33.3% |

New V3 per-bucket rows are western 6/33% coverage/229.5% MAPE,
Mediterranean 6/50%/0.0%, East Asian 5/0%/0.0%, other mixed 2/0%/0.0%,
South Asian 3/0%/0.0%, and Latin American 3/0%/0.0%. The new set exposes
provider uncertainty and sparse exact catalogue labels; no threshold or
baseline was changed to hide that drop. `eval/reports/baseline.json` was not
touched.

## Verification

- `make status` (with the throwaway venv on PATH) regenerated `STATUS.md`.
- `make test`: 91 passed before rebase; 93 passed in the final post-rebase run.
- `make lint`: Ruff clean.
- `scripts/check_invariants.py`: all architectural invariants hold.
- `scripts/status.py --check`: matches repository.
- `eval/harness.py --check-regression`: no per-cuisine regression in V3.

Traps: the first planned `dish_1563216739` overhead URL returned 404; it was
replaced with verified `dish_1561061658` before manifest insertion. Do not
re-add the 404 source or reset the baseline while #78 analyses the current
numbers. Keep the generated scorecard outside `eval/reports/` for this PR.
