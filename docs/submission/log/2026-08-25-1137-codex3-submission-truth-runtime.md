# Submission truth and runtime hardening

Date: 2026-08-25 11:37 +03
Agent: codex3
Issue: #363
Branch: `agent/codex3/submission-truth-and-runtime`

## Done

- Made deterministic keyless demo mode the mobile default and documented the
  explicit live API path.
- Routed correction telemetry through the configured mobile API URL with the
  existing pseudonymous user header. Added event-type selection for candidate,
  portion/quantity, and unchanged review outcomes.
- Required telemetry user scope and a supported event type at the edge. Raw
  idempotency keys are SHA-256 hashed; supported PII patterns are redacted from
  text before the local JSONL append.
- Changed `scripts/curate_dataset.py` from silent synthetic bootstrap/training
  output to fail-loudly human-review candidates. Missing or malformed input is
  rejected and raw idempotency keys are not emitted.
- Appended D18 and aligned README, architecture, evaluation, and submission
  email wording with shipped behavior. Removed six unreferenced Loom mock image
  binaries.

## Verification

- Server: 300 Vitest tests across 25 files; build, typecheck, and ESLint pass.
- Python 3.11 throwaway venv: Ruff and 287 Pytest tests pass; invariants,
  `STATUS.md`, and V3 regression guard pass.
- Mobile: focused tests and TypeScript pass; clean `npm ci`; iOS and Android
  Expo exports pass; Expo Doctor 18/18.
- Offline V0-V3 scorecard was generated independently from `origin/main` and
  this branch. Files are byte-identical: no eval impact.
- No device or live-provider execution was performed in this session. Bundle
  export is not device proof.

## Remaining external work

- Hosted Actions must be read after push. Current main Actions are blocked
  before job execution by the repository account billing/spending state.
- Owner must rotate the provider credential previously pasted in chat.
- Owner must record Loom, insert its URL in the email draft, and invite the
  reviewer to the private repository before sending.

Traps: Never describe local JSONL correction events as a lakehouse, verified
labels, or an automatic learning loop. `curate_dataset.py` must not fabricate
bootstrap events when telemetry is absent. Current mobile npm audit advisories
need an Expo SDK compatibility pass; do not run `npm audit fix --force` before
submission and call the result safe. Simulator, Expo export, and an old
shell-only physical Expo Go check prove different boundaries.
