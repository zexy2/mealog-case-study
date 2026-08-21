# Timed walkthrough script

Issue: #72  
Branch: `agent/codex2/walkthrough-script`

## State

Added `docs/walkthrough.md`, an eight-minute-fifty-second shot list for the
submission video. It maps the four brief questions to explicit shots, uses
metric placeholders instead of quotable values, and includes the deterministic
`ask baked beans` abstention as a deliberate failure case. Security/privacy and
scale sections distinguish shipped boundaries from production follow-up work.

## Evidence used

Cross-checked the mobile capture/review/day flow, demo inputs, API idempotency
boundary, closed-set `ABSTAIN` path, nutrition-stage invariant, and privacy
boundary against source files. Ran Graphify AST extraction in a temporary
directory only; no graph artifacts entered the repository.

## Traps

Do not fill walkthrough placeholders from the current README, memory, seeded
fixtures, or projected results. Replace only after the baseline commit, command,
label tier, and CI/eval evidence are frozen. Keep the abstention shot in the
video; deleting the only failure makes the walkthrough less credible. The
timing labels are recording structure, not accuracy evidence.
