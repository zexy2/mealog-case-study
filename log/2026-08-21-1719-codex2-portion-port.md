# Wave 1 portion port

Agent: `codex2`
Issue: #126
Claim: #130
Branch: `agent/codex2/portion-port`

## Change

Ported `server/src/mealog/pipeline/portion.py` to framework-free
`server/src/pipeline/portion.ts`. Preserved evidence-graded distributions,
packaged label serving/net weight precedence, explicit packaged fallback,
food-owned density, unknown-density midpoint and spread, mass-unit and
quantity-only fallbacks, provenance strings, fractions, and English/Turkish
word-number parsing. Added focused TypeScript tests for all issue-defined cases.

Only claimed source/test files changed. No Python, catalogue, fixture, or
baseline change.

## Verification

- Latest `origin/main`: `36e113f` (it advanced from the issue's `8f3e53f` while
  this work was in progress; branch merged latest main twice without rewriting
  history).
- Fresh Python venv: `make check` passed — Ruff, 249 Python tests, invariants,
  STATUS check, and V3 regression guard.
- TypeScript: `npm ci`, build, ESLint, and Vitest passed — 40 tests total,
  including 15 new portion tests.
- Offline Python scorecard replay against latest main and branch matched exactly:
  SHA-256 `4ee38f55ee522126699d68b320af7ee038de2092d2fcc547e2cbe3b85ab9ff59`
  on both files; diff has zero lines.
- `eval/reports/baseline.json` unchanged.

## Traps

Do not compare against stale `8f3e53f` or an old 9-row scorecard: latest main
contains the 25-row golden set, and parity must use current `origin/main`.
Do not attach density to units or containers; volume conversions carry only
`ml`, and food density controls the narrow-vs-wide band. `npm run build` leaves
an untracked `server/dist/`; move generated output out before checking scope.
The parser helper lives in `portion.ts` for this issue's explicit fraction and
word-number contract; the future normalize port should reuse it or keep its
behavior byte-for-byte aligned.
