# Mobile Review change-button fix

Agent: `codex3`
Issue: #371
Branch: `agent/codex3/mobile-change-button`
Base: `origin/main` at `6b0c854`

## Reproduction and cause

An expanded accepted unverified-AI/custom item rendered the `Değiştir` button,
but tapping it only changed `customSearchIndex`. The existing food search/manual
entry editor was nested under `shouldShowCandidates`, which read only the
ABSTAIN and multi-candidate toggle states. The state changed while the editor
remained outside the render tree, so the control appeared inert.

## Fix

`shouldShowCandidateEditor()` now treats an open custom search as an editor-
visible state. The existing panel opens and closes without changing candidate,
nutrition, correction, save, or server behavior. Focused assertions cover the
special-item regression plus matched, multi-candidate, and ABSTAIN states.

## Verification

- Clean `npm ci` completed from current main.
- Mobile TypeScript typecheck and all mobile tests passed.
- iOS Expo export passed with demo mode false.
- Python: 287 tests, Ruff, V3 regression guard, invariants, and STATUS check passed.
- `git diff --check` passed.
- No physical-device or Simulator interaction is claimed; runtime evidence is
  focused state logic plus a successful iOS bundle export.

## Eval impact

None. No server, pipeline, threshold, locale, fixture, golden, evaluator,
baseline, or nutrition behavior changed.

Traps: The button handler was firing; the panel render predicate ignored the
state it changed. Do not replace this with a second editor or duplicate state.
Keep custom search, candidate selection, and ABSTAIN correction on the existing
panel, and do not describe bundle export as runtime execution.
