# Demo Review fixture alignment

State: PR #324's Review demo now uses the `tr.pilav` fixture selected by the demo scenario, rather than an unrelated Simit count-clarification fixture.

Done:

- Changed only the review demo response to carry `tr.pilav`, 180 g, its 140–230 g band, and its server-shaped macro totals.
- Added a focused contract test that prevents the review demo from reverting to the count-pending Simit fixture.
- Visually checked the iPhone Air iOS Simulator in demo mode: Review shows the 2×2 nutrient card (≈272 kcal, protein, carbohydrate, fat), the portion band, candidates, and the open audit details.

Next: commit and push the focused fix to PR #324; hosted Actions remain blocked by the account billing/spending state, so its CI result cannot be used as evidence.

Traps: Demo fixtures are not live-provider evidence, but they must still match their declared scenario. Do not reuse a count-pending fixture for a portion-review demo; it correctly suppresses stale nutrition and makes the demo appear broken. Node's strip-types test runner cannot resolve `demoData.ts` extensionless Expo imports, so retain the focused source contract unless the test-runner setup is separately scoped.

Branch: `agent/codex3/macro-presentation-hierarchy`
