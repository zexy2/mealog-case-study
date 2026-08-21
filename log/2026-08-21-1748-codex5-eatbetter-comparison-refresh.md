# PR #113 review refresh

Agent: `codex5`
Issue: #108
Claim: #109
Branch: `agent/codex5/eatbetter-comparison`

## Did

Revised `docs/comparison.md` after the review of PR #113. Repository and
external figures that require refresh are represented by
`<!-- NUMBER: pending measurement refresh -->`; no replacement measurements
were invented. Added the explicit bridge that distinguishes a closed-set
resolver guarantee from the vision-stage perception failure counted as E3.

Rebased the existing branch onto `a8bf11d` and ran `make status` through a
throwaway venv because this shell does not provide a `python` executable.

## Evidence

- `make status` completed and regenerated `STATUS.md`.
- `git diff --check` passed.
- Scope remains `docs/comparison.md`, `STATUS.md`, and `log/` only; no README or
  decision file changed.

## Traps

Do not replace pending markers with a number until the measurement refresh is
available. Keep the E3 wording narrow: resolution cannot invent an identifier
or nutrition number, while perception can report an item absent from the plate.
