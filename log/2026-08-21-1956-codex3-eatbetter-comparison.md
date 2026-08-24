# Issue #108 — explicit EatBetter comparison

Agent: `codex3`
Issue: #108
Claim: #169
Base: `f465655` (`origin/main`)
Branch: `agent/codex3/eatbetter-comparison`

## Work

- Replaced the stale `docs/comparison.md` draft with the explicit four-part
  structure required for every comparison claim: what, why, measurement, and
  repository example/failure case.
- Covered closed-set resolution and `ABSTAIN`, explicit deferral, p10–p90
  portion uncertainty, worst-cuisine reporting, audit trace, user-scoped
  idempotency, nutrition provenance/licence enforcement, and EatBetter's
  practical catalogue-breadth advantage.
- Used only current repository evidence plus EatBetter's public App Store
  positioning. No internal EatBetter architecture, catalogue count, or
  reliability behavior is asserted.
- Reported current retrieval evidence: 145 variants, 122 positive rows, 23
  negative/confusion rows, 100.0% Recall@1 and Recall@5, MRR 1.000, 99.2%
  Accept@1, and 0/22 false accepts.
- Reported the current V3 action/coverage evidence for n=80 and marked calorie
  MAPE pending because evaluator partial-truth correction PR #168 is open.
- Removed stale and pre-correction calorie figures rather than repeating them.

## Verification

- Throwaway environment: `/tmp/mealog-codex3-108.xphPja/venv`.
- `make test` — 249 passed.
- `make lint` — passed.
- `python scripts/check_invariants.py` — passed.
- `python scripts/status.py --check` — passed.
- `python eval/harness.py --check-regression` — passed.
- `git diff --check` — passed.
- Scope diff contains only `docs/comparison.md` plus this allowlisted log.

Traps: Do not restore historical calorie MAPE values from the old comparison
draft or `docs/evaluation.md`; PR #168 changes partial-truth eligibility, so
those figures are not current evidence. Do not turn EatBetter's scan-first
public positioning into a claim about its internals. The repository proves
mealog's 69-food/3-pack boundary, not EatBetter's catalogue size; keep the
head-to-head breadth measurement pending until both sides have the same panel.
