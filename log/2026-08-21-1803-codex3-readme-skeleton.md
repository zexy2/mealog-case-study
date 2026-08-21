# README skeleton

Agent: codex3
Issue: #114
Claim: #154
Base: `a8bf11d`

## Done

- Replaced stale README content with the reviewer-path skeleton requested on #114.
- Kept title and thesis first, followed by exact walkthrough and results pending markers.
- Added keyless fixture instructions, pinned Python and Node runtime guidance, TypeScript and mobile verification commands, emulator route caveat, brief architecture, five decision rows, testing boundary, limitation markers, prioritized follow-up work, and AI-usage marker.
- Removed stale measurements, sample references, old Python-serving claims, and unverified walkthrough/comparison claims from README.
- Preserved exactly one `TODO(` occurrence, so generated `STATUS.md` remains unchanged.

## Verification

- `python3.11` throwaway virtualenv with `server[dev]` dependencies.
- `make check` — passed: Ruff, tests, invariants, status check, and regression gate.
- `git diff --check` — passed.
- `README.md` word count stays within requested skeleton range.
- No device or emulator execution claimed; only CI-equivalent mobile typecheck/export was previously verified.

## Traps

Do not replace pending markers with guessed metrics, sample counts, or walkthrough claims. The single `TODO(` is consumed by `scripts/status.py::probe_writeup`; changing its count changes generated STATUS.md. README commands must remain keyless and evidence-backed. Mobile bundle export does not prove emulator or device execution.
