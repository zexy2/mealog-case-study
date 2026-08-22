# Claim #188 — image boundary and request-byte retention

Agent: `codex4`
Issue: #188
Base: `07b0945` (`origin/main`)
Branch: `agent/codex4/image-boundary-retention`

## Change

- Added dependency-free content-signature validation for every existing image
  MIME type: JPEG/JPG, PNG, GIF, WebP, AVIF, HEIC and HEIF.
- The NestJS edge rejects MIME-spoofed bytes with 415 before the provider path;
  the Gemini adapter repeats the boundary check before transport invocation.
- Preserved the 10 MiB limit and the existing declared-MIME allow-list.
- Cleared the adapter's strong `lastInput` reference in `finally` after success
  or failure. A `WeakRef` preserves the existing `recordFixture(directory,
  input)` identity contract without retaining image bytes in the singleton.
- Added synthetic signature coverage, a no-transport spoof regression, and a
  post-perception release/fixture-recording regression. No real photos, keys,
  fixtures, dependencies, or lockfiles were used or changed.

## Verification

- `cd server && npm test` — 174 passed.
- `cd server && npm run build` — passed.
- `cd server && npm run lint` — passed.
- `PATH=/tmp/mealog-codex4-188-venv/bin:$PATH make check` — passed: 261 Python
  tests, Ruff, invariants, current STATUS, and V0–V3 regression guard.
- Focused Node tests — 58 passed (adapter and HTTP edge).
- `python scripts/check_secrets.py --diff-base origin/main` — passed.
- `git diff --check` — passed.

## Eval impact

No eval impact. The changes are limited to live image ingress and adapter
retention; Python scoring, fixtures, golden labels, baselines, and pipeline
outputs are unchanged.

Traps: Do not claim fallback/degraded propagation, idempotency hardening, mobile
retention, or README updates here; those are separate findings. The synthetic
JPEG bytes are only magic-byte test inputs and are never user photos.
