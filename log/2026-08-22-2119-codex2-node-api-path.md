# Node reviewer API run path

Agent: `codex2`
Issue: #200
Branch: `agent/codex2/node-api-path`
Base: `4bcbfa3` (`origin/main`, after PR #199)

## Change

- Changed only `make api` in `Makefile` to run `npm run build && npm start` in
  `server/`, using the delivered Node.js/TypeScript NestJS service.
- Left Python `make check`, `make eval`, `make eval-live`, and reference tooling
  unchanged. This fixes backend run-path ambiguity; it does not remove or
  replace Python evaluation/reference tooling.

## Verification

- `cd server && npm ci` — passed in the isolated worktree.
- `cd server && npm run build` — passed.
- `cd server && npm run lint` — passed.
- `cd server && npm run test` — 16 files, 193 tests passed.
- `PORT=4310 make api` — compiled and started NestJS; `GET /health` returned
  `{"status":"ok","vision":"fixture"}`.
- `PATH="/tmp/mealog-codex2-api-venv/bin:$PATH" make check` — passed in a
  throwaway virtualenv: Ruff, 261 Python tests, invariants, STATUS check, and
  V0–V3 regression guard.
- `git diff --check` — passed.

## CI follow-up

The first pull-request check stopped at claim scope because the repository
scope parser ignores a bare root filename. Claim #200 was corrected with its
parser-normalized `Makefile/` spelling; this still resolves to exactly
`Makefile`. No implementation scope changed.

The rerun hosted Actions runs `32590635835` and `32590637862` passed `check`,
`server (node)`, and `mobile`; `main-arrived-via-pull-request` was skipped by
design.

## Eval impact

No evaluator, golden data, baseline, scorecard, pipeline, or application
behavior changed. Coverage, F1, MAPE, and regression output remain unchanged.

Traps: `make api` must not launch `server/src/mealog/api/main.py`; that is the
legacy Python reference server. Do not delete Python dependencies or rewrite
the Python evaluation targets while fixing this reviewer-facing Node path.
