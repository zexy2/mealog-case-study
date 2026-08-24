# Turkish abstention copy

State: The Abstention screen no longer renders the provider's free-text `item.query` as a food name. An unknown provider phrase can be English or mixed-language and is not Turkish catalogue data. The visible screen and default local fallback record now use the Turkish neutral name `Katalog dışı öğün`.

Done:

- Replaced interpolated raw provider text in the catalogue-gap title and subtitle with Turkish, evidence-safe copy.
- Moved remaining Abstention alerts, manual-calorie controls, and prototype copy into typed Turkish/English dictionaries.
- Added tests covering an English provider phrase and a source-level guard against restoring `rawDishName`.
- Passed `npm test`, `npm run typecheck`, iOS/Android Expo exports, `git diff --check`, and fresh-venv `make check` (289 Python tests; invariant, status, and regression checks passed).

Next: Review and merge the follow-up PR. No manual Simulator interaction of this exact patch was performed; bundle export is not device evidence.

Traps: Do not add a client-side food-name translation table for arbitrary provider text. Food names are locale-pack data; an ABSTAIN result has no verified canonical name. Do not let raw provider text leak into a local note or manual-calorie record by default.

Branch: `agent/codex3/turkish-abstention-copy` (uncommitted at log time)
