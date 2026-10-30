# Issue #124 — nutrition and confidence port

Agent: `codex4`
Claim: #149
Branch: `agent/codex4/nutrition-confidence`
Base: `a8bf11d` (`origin/main`)

## Change

- Added framework-free `server/src/pipeline/nutrition.ts`, porting the pure
  per-100g scaling and ordered nutrient total from Python.
- Added framework-free `server/src/pipeline/confidence.ts`, preserving empty
  meal and abstention routing, `AUTO_ACCEPT = 0.75`, `ASK_BELOW = 0.40`, and
  the weakest-item rule.
- Added focused tests for single/multiple/zero/missing-macro/negative nutrition
  inputs and for confidence boundaries, review/ask routing, abstention, and
  empty meals.
- No Python, catalogue, fixture, threshold, or evaluation file changed.

## Nutrition numeric comparison

The same four loaded catalogue foods and masses produced exactly equal parsed
JSON values in Python and TypeScript:

```text
us.chicken_breast_grilled @ 120.7g: {'kcal': 199.155, 'protein_g': 37.417, 'carb_g': 0.0, 'fat_g': 4.3452}
us.rice_white_cooked @ 158.0g: {'kcal': 205.4, 'protein_g': 4.266000000000001, 'carb_g': 44.556, 'fat_g': 0.474}
tr.kuru_fasulye @ 250.0g: {'kcal': 295.0, 'protein_g': 17.25, 'carb_g': 33.0, 'fat_g': 10.75}
jp.rice_steamed @ 200.0g: {'kcal': 336.0, 'protein_g': 5.0, 'carb_g': 74.2, 'fat_g': 0.6}
total: {'kcal': 1035.555, 'protein_g': 63.933, 'carb_g': 151.756, 'fat_g': 16.1692}
numeric equality: PASS (Python JSON == TypeScript JSON)
```

## Verification

- Fresh throwaway venv: `/tmp/mealog-codex4-124-venv` with
  `pip install -e "server[dev]"`.
- `make check` — Ruff passed; 249 Python tests passed; invariants passed;
  `STATUS.md` matched; V3 regression passed.
- `npm run build` — passed.
- `npm run lint` — passed.
- `npm test` — 104 TypeScript tests passed.
- V0–V3 scorecard from the detached `a8bf11d` baseline and this branch:
  SHA-256 `4ee38f55ee522126699d68b320af7ee038de2092d2fcc547e2cbe3b85ab9ff59`
  before and after; `diff -u` exit 0 with 0 lines.
- `git diff --check` — passed.

Traps: Do not implement D11's portion-uncertainty gate or adjust either
confidence threshold here. Keep `nutrition.ts` framework-free and do not move
nutrition into adapters, retrieval, or the API. `npm run build` creates an
untracked `server/dist/`; remove it before checking the four-file source scope.
