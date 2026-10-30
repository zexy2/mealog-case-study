# Session Log: 2026-08-25 15:39

Agent: codex
Issue: #377
Branch: `agent/codex/fix-architecture-mermaid`

## Done

- Replaced the semicolon in the Section 2 Mermaid sequence message with plain
  wording so GitHub's Mermaid renderer does not misparse the message boundary.
- No source, fixture, catalogue, baseline, evaluator, or dependency changes.

## Verification

- Mermaid parser validation passed on the updated sequence diagram.
- `git diff --check` passed.
- `make check` passed in throwaway venv: Ruff, 287 Pytest tests, architectural
  invariants, `STATUS.md` check, and V3 regression guard.

## Eval impact

None. Documentation-only syntax correction; runtime and evaluation behavior are unchanged.

## Traps

GitHub's Mermaid renderer can reject punctuation in sequence-message text even
when a newer local Mermaid parser accepts it. Keep sequence messages plain when
the hosted renderer reports a line-boundary parse error.
