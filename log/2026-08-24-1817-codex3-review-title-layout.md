# Review title layout

State: Review item titles no longer compete with status badges for a narrow right-column layout.

Done:

- Moved match and portion status badges below the selected food name within the item-information column.
- Kept the badges wrapping naturally on narrow screens instead of constraining the food name to letter-level line breaks.
- Added a focused source contract test for that layout boundary.
- Checked the updated demo Review flow on iPhone Air iOS Simulator: `Sade pirinc pilavi` remains readable in one line; badges, macro card, and portion question remain visible.

Verification: `npm test`, `npm run typecheck`, `npx expo export --platform ios`, and `git diff --check` passed. This is iOS Simulator demo-mode evidence only, not physical-device or live-provider evidence.

Traps: Long confidence copy must wrap below an item name, never squeeze the name into a side column. Simulator screenshots show demo fixtures only; do not use them as live-provider proof.

Branch: `agent/codex3/macro-presentation-hierarchy`
