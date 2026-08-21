# Strip invalidated evaluation figures

- Claim: #120 for issue #117.
- Branch: `agent/codex3/strip-invalidated-eval-numbers`.
- Base: `origin/main` at `263c159`.
- Scope: `docs/evaluation.md` and `log/` only.

## Change

Removed stale measurement figures from the evaluation document without writing replacement values. The old western headline and packaged-yogurt arithmetic were invalidated by PR #94, so the headline, packaged prediction/band/kcal/APE cells, APE ordering/shares, and affected counterfactual cell now carry the exact pending-measurement marker. The packaged row's obsolete `E7` tag was removed. The stale `tr_0001` retrieval proposal cell, including its old score, was also removed behind a marker because the 53-food retrieval fix in PR #99 changed that proposal. Added one scorable-count sentence with a pending marker; no numeric count was added.

Methodology, tier definitions, thresholds, reproducible unchanged rows, and the decomposition narrative remain. No README, eval input, baseline, pipeline, catalogue, fixture, or golden file changed.

## Verification

- Fresh throwaway venv: `/private/tmp/mealog-codex3-117-venv.nEkfDD`; `pip install -e 'server[dev]'` passed.
- `make test` — 249 passed.
- `make lint` — Ruff clean.
- `python scripts/check_invariants.py` — pass.
- `python scripts/status.py --check` — pass.
- `python eval/harness.py --check-regression` — no per-cuisine regression in V3.
- `git diff --check` — pass.
- Current decomposition generator was run for comparison only; its current values were not copied into the document.
- Graphify docs semantic scan was unavailable because no Anthropic key is configured; manual document/generator comparison supplied the evidence.

No device, provider, fixture, or network evaluation was performed. No eval metric changes are expected.

Traps: Do not replace a stale marker with the current `12.69%`, `12.7%`, `170.0 g`, or any other locally observed result; measurement refresh owns new numbers. Do not restore `229.49%`, `433.6%`, or the old `0.818` retrieval score. Do not turn the pending scorable-count marker into a guessed golden-set size before the measurement refresh settles.
