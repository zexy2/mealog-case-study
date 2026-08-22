# Session log — final delivery documentation

- Agent: `codex`
- Issue: #189
- Branch: `agent/codex/final-delivery-docs`
- Requested base: `origin/main` at `e85975e`; before push, fetch advanced
  `origin/main` to `07b0945`, and the branch was rebased normally onto that commit.
- Scope changed: `docs/assumptions.md`, `docs/comparison.md`, `docs/walkthrough.md`, this log.

## Done

- Removed the unsupported hosted-backend claim and the hardcoded calendar deadline.
- Reconciled the documentation with the Node.js/TypeScript Nest edge and `POST /v1/meals`.
- Updated catalogue count from 69 to 99 and replaced stale pre-refresh metrics with the current n=80 V3 evidence: 12/80 committed, 68/80 ask, Item F1 0.15, FP 86.0%, and 12.7% calorie MAPE over 2/2 eligible/scored complete-positive rows.
- Made the partial-truth boundary explicit: 72 rows are outside the calorie denominator; seven covered partial rows remain diagnostic only.
- Bounded claim #187 to its recorded iOS Simulator/Expo Go live-provider runtime smoke. No hosted deployment or live multi-item gate is claimed before Codex5's retest.
- Documented process-local idempotency, optional unauthenticated `X-User-Id`, liveness-only health, non-durable observability, retry/fallback limits, and application-side photo retention.
- Kept EatBetter comparison limited to public App Store evidence and explicitly separated the fixed 145-variant ambiguity guard from catalogue-growth evidence.

## Verification

Exact command results:

```text
$ python3 scripts/status.py --check
STATUS.md matches the repository

$ git diff --check
status_rc=0 diff_rc=0
```

Additional local checks:

```text
$ make check
cd server && python -m ruff check src tests
/bin/sh: python: command not found
make: *** [lint] Error 127

$ python3 scripts/check_invariants.py
all architectural invariants hold

$ python3 eval/harness.py --configs V0,V1,V2,V3 --check-regression
ModuleNotFoundError: No module named 'sklearn'

$ python3 -m ruff check server/src server/tests
/opt/homebrew/opt/python@3.14/bin/python3.14: No module named ruff

$ python3 -m pytest -q server/tests
/opt/homebrew/opt/python@3.14/bin/python3.14: No module named pytest
```

No source, evaluator, baseline, golden label, mobile, or README file was changed.
No dependency was added. CI must remain the authority for the unavailable Python
environment checks.

Hosted Actions run `32570750786` was read after push:

```text
check          pass
server (node)  pass
mobile         pass
main-arrived-via-pull-request  skipped (expected for a PR)
```

The hosted `check` job passed its secret guard, Python lint, tests, invariants,
claim-scope gate, status check, and eval regression guard.

Traps: Do not edit `README.md` (Codex2 owns PR #180). Do not turn claim #187's
runtime smoke into deployment or live multi-item-gate evidence. Do not score the
72 partial-truth rows as zero calories, and do not infer EatBetter internals from
its public listing.
