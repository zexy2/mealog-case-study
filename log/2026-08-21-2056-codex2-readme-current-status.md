# README current-status refresh

Agent: codex2
Claim: #179
Requested issue: #100
Branch: `agent/codex2/readme-current-status`
Base: `origin/main` at `bc63df7`

## Change

- Updated `README.md` to describe the merged NestJS edge, provider adapters,
  runner, retrieval seam, evaluator correction, 80-sample fixture-backed set,
  merged walkthrough script, and merged EatBetter comparison.
- Kept device/emulator execution, live mobile-to-Node proof, deployment URL,
  live-provider accuracy, final calorie metrics, and pending PR #158 catalogue
  expansion explicitly unverified or pending.
- Preserved D12 wording: Node.js/TypeScript is delivered service; Python is
  offline research/reference tooling.
- Changed no results number, baseline, evaluation document, comparison
  document, source, locale pack, fixture, or generated STATUS file.

## Verification

- `python scripts/status.py --check`: unavailable because this shell has no
  `python` executable (`command not found`).
- `python3 scripts/status.py --check`: passed — `STATUS.md matches the repository`.
- `git diff --check`: passed.
- Changed paths before commit: `README.md` and this session log only.

## Traps

Current `origin/main` has PR #174 merged, even though the task context described
it as open. PR #158 remains open and must not be reported as merged. Do not add
device proof, live-provider accuracy, deployment URL, or final calorie metrics
until reproducible evidence and the evaluation-document refresh exist. Keep
`eval/reports/baseline.json` and `STATUS.md` untouched.
