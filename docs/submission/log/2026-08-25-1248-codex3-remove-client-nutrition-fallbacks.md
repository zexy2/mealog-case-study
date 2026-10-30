# Remove client nutrition fallbacks

State: Mobile catalogue misses no longer create kcal, macro, gram, confidence, or provenance values from hardcoded pseudo-LLM estimates.

Done:
- Reproduced the defect with a focused red test: the client contained `getSmartItemLlmEstimate`, generated-estimate acceptance, and empty-input 200/250 kcal defaults.
- Removed the generated-estimate cards and acceptance route from Review, Abstention, and App.
- Removed broad client mappings such as burger to köfte and pasta to mantı from the add-item fallback.
- Catalogue misses now remain unresolved. Users may choose a catalogue candidate, save an uncaloried note, or explicitly enter calories; manual entries carry zero unknown grams/macros.
- Added `apps/mobile/src/nutrition-safety.test.mjs` and wired it into the mobile test command.
- Passed mobile tests/typecheck, iOS and Android Expo exports, 304 Node tests/build/typecheck/lint, 287 Python tests/lint, regression guard, invariants, status check, and diff check.

Next: A real provider-backed estimate must be a separate server contract and decision. It should return ranges and assumptions, stay `review`, use explicit unverified provenance, and never masquerade as catalogue nutrition.

Traps: A function named like an LLM estimate was entirely local hardcoded data; an API call was never made. Do not restore client-side nutrition or place `GEMINI_API_KEY` in Expo. Empty manual fields must fail validation, not silently become a calorie value.

Branch: `agent/codex3/chicken-egg-abstain`

Commit: pending
