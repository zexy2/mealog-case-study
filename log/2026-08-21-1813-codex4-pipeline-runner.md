# Issue #155 — pipeline runner orchestration

Agent: `codex4`
Claim: #157
Branch: `agent/codex4/pipeline-runner`

## Change

- Ported the Python runner's V0–V3 configurations and stage order to
  `server/src/pipeline/runner.ts`.
- The runner accepts `VisionPort` and `VisionInput | string`; it imports no
  adapter or framework code.
- Preserved V0 ungrounded baseline behavior, locale normalization, retrieval,
  closed-set resolution, portion estimation, nutrition, and confidence routing.
- Resolver `ABSTAIN` results remain in `MealLog.items`, skip portion/nutrition,
  and are excluded from totals rather than being dropped or treated as food.
- Added handwritten-stub tests for end-to-end success, abstention propagation,
  empty vision, fixture compatibility, text validation, and an explicit mocked
  full-stage ordering trace.
- No Wave 1 module, Python file, adapter, app, fixture, or catalogue changed.

## Verification

- Branch base commit: `81309f7eebec44ddfd2a8626d2b850ff88b0f283`.
- Base V0–V3 scorecard SHA-256:
  `4ee38f55ee522126699d68b320af7ee038de2092d2fcc547e2cbe3b85ab9ff59`.
- Final commit: `654770a24581f5259cfcebbba9fc7cfe17f7da17`.
- Branch V0–V3 scorecard SHA-256:
  `4ee38f55ee522126699d68b320af7ee038de2092d2fcc547e2cbe3b85ab9ff59`.
- `diff -u` between base and branch scorecards exited 0 with 0 lines.
- Fresh throwaway venv: `/tmp/mealog-codex4-155-venv`.
- `make check` — Ruff passed; 249 Python tests passed; invariants passed;
  `STATUS.md` matched; V3 regression passed.
- `npm run build` — passed.
- `npm run lint` — passed.
- `npm test` — 112 TypeScript tests passed, including 8 runner tests.
- `git diff --check` — passed.

Traps: Do not import a concrete vision adapter into the runner or add retries,
idempotency, HTTP, or fallback-ladder behavior; #145 and the following API issue
own those boundaries. Do not "clean up" the Wave 1 signatures here: the runner
uses narrow structural casts at their existing seams and the individually
proven modules must remain untouched. `npm run build` creates untracked
`server/dist/`; remove it before the scope check.
