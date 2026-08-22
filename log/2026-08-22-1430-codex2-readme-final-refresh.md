# README final refresh

Agent: codex2
Issue: #179
Branch: `agent/codex2/readme-current-status`
Base: `origin/main` at `e85975e`

## Done

- Synced published branch with current `origin/main` using a non-destructive
  merge commit. AGENTS.md forbids rebasing a published branch followed by a
  force-push.
- Refreshed `README.md` to state that the Node.js/TypeScript NestJS backend is
  delivered, while keeping live-provider accuracy and deployment unverified.
- Added current offline V3 evidence: 80 samples, 15% coverage (12/80), Item
  F1 0.15, FP rate 86.0%, kcal MAPE 12.7%, and 2/2 calorie-eligible/scored
  rows, with per-cuisine denominators.
- Recorded current inventory: 3 locale packs, 99 canonical foods, and 80
  recorded golden-set fixtures.
- Documented Node, mobile, demo-mode, and offline Python run boundaries.
- Distinguished verified iOS/Android bundle exports and coordinator-recorded
  physical Expo Go smoke from unverified interactive iOS Simulator execution,
  live mobile-to-Node requests, and multi-item preservation.
- Added security/privacy limitations: optional non-authenticated `X-User-Id`,
  process-local idempotency, bounded in-memory image handling, provider-side
  retention, no consent/deletion workflow, and declared-MIME-only validation.

## Verification

- `python scripts/status.py --check`: unavailable; this shell has no `python`
  executable.
- `python3 scripts/status.py --check`: passed — `STATUS.md matches the repository`.
- `git diff --check`: passed.
- Only `README.md` and this session log are changed relative to `origin/main`.

## Traps

Do not turn bundle exports, a physical Expo Go smoke, or fixture replay into
iOS Simulator proof, live-provider accuracy, deployment proof, or live
multi-item preservation. Keep `eval/reports/baseline.json`, evaluator logic,
locale data, and source code out of this documentation-only change. Current
evaluation MAPE has a 2/2 eligible/scored denominator; empty or excluded
calorie rows are not zero-error rows.
