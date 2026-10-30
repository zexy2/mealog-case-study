# Node walkthrough script rewrite

Agent: `codex4`
Issue: #220 (claim for #118)
Branch: `agent/codex4/walkthrough-node-rewrite`
Base: `cd0d7b5` (`origin/main`)

## Done

- Rewrote `docs/walkthrough.md` as an 8:00 timed script for the Node/TypeScript
  submission.
- Removed stale catalogue and live-smoke claims and used only the coordinator's
  measured figures: 15% coverage (12/80), Item F1 0.15, FP 86.0%, 12.7% MAPE,
  V0/V3 ablation, retrieval evidence, ten correct abstentions, the bounded
  2026-08-23 live verification, and scorecard SHA `bfb1703b…`.
- Put the **TWO scorable rows** denominator in the spoken 6:50–7:30 limitations
  segment.
- Added the two-simit photo-count defect exactly as currently open under #218,
  with the merged-and-reverified wording marked conditional rather than claiming
  the fix is done.
- Kept the mandatory 2:20–2:50 abstention beat, the model's wrong-calorie
  moment and detection path, the one-diagram/no-folder-tour rule, and labelled
  fixture fallback guidance.

## Verification

- `PATH=/tmp/mealog-codex4-walkthrough-venv.GO2i58/bin:$PATH make check` — passed:
  Ruff, 280 Python tests, architectural invariants, STATUS check, and V3
  regression guard.
- `git diff --check` — passed.
- The spoken `Say` blocks are 1,239 words, sized for the 8:00 run-of-show at a
  measured narration pace; the timing table remains the authoritative edit
  structure.
- No live provider call was made; no Gemini key was available or needed.
- No evaluator, fixture, golden, baseline, runtime, mobile, or dependency file
  changed.

## Eval impact

None. This is documentation-only; the offline scorecard and runtime behavior
are unchanged.

## Traps

Do not remove the `PENDING` marker from the live abstention or the 503 mobile
copy until that exact current-main client-to-Node rehearsal is verified. Do not
replace the **Still open** #218 sentence with the conditional fixed wording
unless #218 has merged and the same live two-simit check has been rerun. Keep
the 12.7% MAPE denominator as two scorable rows; never imply it is an n=80
calorie denominator. Do not add newer or rounded figures during recording.
