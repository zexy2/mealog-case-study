# CI secret guard

Agent: `codex4`
Claim: #74
Issue: #64 (Part 2)
Branch: `agent/codex4/secret-guard`

## Authority and scope

Read the coordinator's unblocking comment on #74 first. It records that #75
merged at 09:30 and released `scripts/`, `server/tests/`, and
`.github/workflows/ci.yml`; Part 1 key rotation remains human-owned.

## Change

- Added `scripts/check_secrets.py`, which scans every tracked tree file and
  added lines in `origin/main...HEAD`.
- It rejects Google API key shapes, tracked `.env`/`.env.*` files except
  `.env.example`, non-placeholder `GEMINI_API_KEY` assignments, and high-
  entropy values assigned to KEY/TOKEN/SECRET variables.
- The generic check is assignment-scoped, so fixture `model_id` values and
  golden-manifest SHA-256 hashes are ordinary data and do not trigger it.
- Added the CI workflow step and two regression tests: a runtime-generated
  synthetic Google key fails, while the real fixture and manifest pass.

## Evidence

- Fresh venv: `/private/tmp/mealog-codex4-74-venv.53r8ue`.
- Focused secret-guard tests: 2 passed; Ruff passed.
- `make check`: 93 tests passed, lint, invariants, generated STATUS check, and
  no per-cuisine regression passed.
- Direct CI-equivalent guard: `scanned 152 tracked files and added diff lines`.
- No real credential, `.env`, fixture, manifest, or dependency was added.

Traps: Do not replace the assignment-scoped heuristic with a scan of every
long string; that would flag legitimate `model_id` values and manifest
SHA-256 hashes. Keep the literal Google-key scan broad, keep findings free of
secret values, and pass `--diff-base origin/main` in CI so tree and diff are
both checked.
