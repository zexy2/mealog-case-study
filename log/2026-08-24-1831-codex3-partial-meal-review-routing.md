# Partial-meal review routing

State: A meal with both resolved catalogue items and an unresolved item now stays in Review. The full Abstention screen is reserved for an empty perception or a meal where every item is `ABSTAIN`.

Done:

- Strengthened the live Gemini prompt: every visible primary dish or edible side must be a separate `items[]` object; comma-separated composite observations are forbidden.
- Bumped live prompt provenance from `p4` to `p5`; committed `p3` fixtures remain unchanged and no score was re-reported.
- Kept known items visible in Review for a partial result, exposed even a single candidate for an unresolved item, and blocked saving until that item is resolved.
- Added prompt-version/contract and mobile routing/save-guard checks.

Verification:

- Server: 297 Vitest tests and `npm run typecheck` passed.
- Mobile: `npm test`, `npm run typecheck`, and iOS Expo export passed.
- Throwaway venv: 289 Python tests, lint, regression guard, invariants, STATUS check, and diff check passed.
- Started an iPhone Air iOS Simulator against the live Node Gemini service with `EXPO_PUBLIC_DEMO_MODE=false`; the fresh capture screen loaded. No post-change live-photo outcome is claimed yet: the operator must retest the original mixed plate, and the result must be recorded as `p5` evidence rather than assumed from the prompt.

Traps: A single unresolved component must not erase resolved components, and it must not be silently omitted on save. Prompt wording is not accuracy evidence; re-run the same photo and compare `p5` result with the earlier `p4` response before making a success claim. Do not commit `server/dist/`; it is local runtime output only.

Branch: `agent/codex3/partial-meal-review`
