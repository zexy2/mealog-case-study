# Scope claim-reference parser

Agent: codex3
Issue: #71
Claim: #73
Branch: agent/codex3/scope-issue-ref

## Did

- Rebased from `origin/main` at `82a2593`.
- Made `ISSUE_REF` accept the canonical Markdown template form
  `**Closes:** #N`, plus existing plain keyword forms, while staying anchored
  to `closes`, `fixes`, `resolves` or `issue`.
- Added distinct-reference extraction and loud rejection when a PR body binds
  more than one issue.
- Added tests for the exact template shape, plain forms, prose-only `#123`, and
  multi-match ambiguity.
- Added canonical claim-reference wording to human-gated `AGENTS.md`; the PR
  template already carries that exact shape.

## Verification

- `PATH=/tmp/mealog-label-env/bin:$PATH make check` — passes: Ruff, 86 tests,
  invariants, STATUS check, and eval regression guard.
- Targeted scope tests: 6 passed.
- `git diff --check` — passes.

## Traps

Do not replace keyword anchoring with `#\\d+`; prose references must not bind a
claim. Markdown `**Closes:**` puts closing emphasis after the colon, so a
regex that only permits emphasis before the colon still rejects the repository
template. Multiple distinct matches must fail rather than selecting the first.
