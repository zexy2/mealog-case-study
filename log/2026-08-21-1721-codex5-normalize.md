# Issue #122 — Wave 1 normalize port

Agent: `codex5`
Issue: #122
Claim: #135
Branch: `agent/codex5/normalize`
Base: `origin/main` at `f2bd820`

## Change

- Added `server/src/pipeline/normalize.ts`, a framework-free port of the Python
  normalizer: pack-driven char maps, lowercase/accent folding, Unicode token
  extraction, numeric/vulgar/mixed/word quantities, article skipping, and
  `NormalizedItem` construction with the original observation retained.
- Added `server/test/pipeline.normalize.test.ts` covering Turkish dotted and
  dotless `i`, diacritic folding, mixed Turkish/English text, numeric and word
  quantities, the Turkish `kepçe` → `kepce` unit token, normalizing, and the
  `applyRules=false` path.
- No Python source, locale data, evaluation input, dependency, or generated
  STATUS file was changed.

## Verification

- `npm ci` — passed, 281 packages, zero vulnerabilities.
- `npm run build` — passed.
- `npm run lint` — passed.
- `npm run test` — passed: 32 tests in 3 files.
- D12 parity replay: Python scorecard hash on detached `origin/main` and this
  branch both `4ee38f55ee522126699d68b320af7ee038de2092d2fcc547e2cbe3b85ab9ff59`; `diff -u` produced no lines.
- Fresh throwaway venv `/private/tmp/mealog-codex5-normalize-venv.2UnHT6`:
  `make check` passed — Ruff, 249 Python tests, invariants, STATUS check, and
  V3 regression guard.
- `git diff --check` — passed.

Traps: The TypeScript module must not import NestJS or a locale by name. Do not
replace pack `char_map` plus accent stripping with JavaScript locale lowercasing;
the Turkish dotted/dotless `i` rule is data and the Python order is observable.
Do not expect `parsePortion` to validate a unit against catalogue data here: it
returns the folded token, and the later portion stage owns the pack lookup. Keep
`server/dist/` out of commits after `npm run build`.
