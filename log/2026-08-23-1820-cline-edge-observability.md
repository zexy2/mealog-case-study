# 2026-08-23 18:20 — cline — structured observability at the edge

**Issue:** #247
**Branch:** `agent/cline/edge-observability`
**PR:** see `Closes: #247`

## What I did

Landed the observability layer as one module plus one global interceptor:

- `server/src/obs.ts` — level-filtered JSON logging, counters and duration
  histograms, `event()` for named events and `stageAsync()` for timed stages.
- `server/src/app/observability.interceptor.ts` — registered once via
  `APP_INTERCEPTOR`, so every route is covered whether or not its author
  remembered to log. Emits `request` on success and `request_failed` on throw.
- `/metrics` on `MetricsController`, next to `/healthz`.
- `idempotent_replay` events in `MealsService`, split by `source:
  completed | in_flight`.
- `stageAsync('pipeline', …)` around the pipeline run, tagged with config,
  provider, locale and input mode.

`LOG_LEVEL` is resolved once at module load in `app.module.ts`.

## Why the interceptor rather than per-controller logging

Per-controller logging is a convention, and conventions decay when several
agents edit in parallel — the next controller added is the one that forgets.
Registering it globally makes coverage structural.

## Eval impact

None. No file under `pipeline/`, `domain/`, `locale_packs/`, `eval/fixtures/` or
`eval/golden/` is touched by this branch, so the scorecard cannot move. This was
a deliberate split: the working tree also contained an admissibility gate, which
*does* change pipeline behaviour and is going out separately.

## Verification

- `cd server && npm run lint` → clean
- `cd server && npm run build` → clean
- `cd server && npx vitest run` → 18 files / 250 tests pass, including the new
  `obs.test.ts` (10) and `observability.e2e.test.ts` (10)
- `python3 scripts/check_invariants.py` → all architectural invariants hold
- `python3 scripts/status.py --check` → STATUS.md matches the repository

## Traps

- **`make lint`, `make test` and `make status` do not exist as AGENTS.md §7
  spells them.** The delivered stack's targets are `ts-lint`, `ts-build`,
  `ts-test`, and the Python ones are `lint-reference` / `test-reference`. §7 and
  the PR checklist still name the old ones. Run `make check`, or the npm
  commands directly, and do not report "make lint passes" without having run
  something that exists.
- **`scripts/status.py` shells out to `python`.** On a machine with only
  `python3` on PATH, `make status` fails with a confusing error that looks like a
  status-file problem. Call `python3 scripts/status.py` directly.
- **`server/dist/` was not ignored on `main` at the time of this branch.** Run a
  build and `git status` fills with compiled output that is easy to stage by
  accident. The `.gitignore` fix belongs to the infra axis, not here, so on this
  branch delete `server/dist` before staging. Check `git status --porcelain`
  after every build.
- **Do not stage by "everything that is dirty".** This working tree held three
  unrelated bodies of work at once. Stage by explicit path list against the
  claim scope, then re-read `git status --porcelain` before committing.
