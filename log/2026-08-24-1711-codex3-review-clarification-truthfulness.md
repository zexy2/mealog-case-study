# Review clarification truthfulness

State: Review treats an unresolved count as unresolved: it withholds the stale catalogue-default portion band, nutrient strip, source and provenance. A numeric count edit also waits for the server correction response instead of scaling grams or nutrients on device. Choosing `Emin değilim` explicitly retains the original standard catalogue portion.

Done:

- Added a `SafeAreaProvider` around every app state; Review clips its scroll viewport so content cannot escape its screen boundary.
- Kept the primary button label as an action and moved disabled-state guidance above it.
- Made audit labels distinguish food-match confidence from portion evidence.
- Added focused state checks for unanswered count, numeric server refresh, explicit uncertainty, and non-count portions.
- Passed `npm test`, `npm run typecheck`, iOS and Android Expo exports, and `make check` in `/tmp/mealog-review-venv` (289 Python tests; invariants, status, and regression check passed).

Next: Review and merge the PR. A manual Simulator pass of this exact patch was not run; bundle export is not device evidence.

Traps: Do not calculate `grams` or nutrition from a count on the client. `POST /v1/meals/correct` is the only recalculation path. `SafeAreaView` without a root `SafeAreaProvider` did not give a reliable iOS inset boundary.

Branch: `agent/codex3/review-clarification-truthfulness` (uncommitted at log time)
