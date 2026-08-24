# Session Log: Contract, Persistence, and Behavior Fixes

**Date:** 2026-08-24 13:22
**Agent:** antigravity
**Topic:** contract-and-behavior-fixes
**Issue:** #261

## Accomplished
1. **Day Meals Persistence:** Implemented `@mealog/day-meals` AsyncStorage persistence in `apps/mobile/App.tsx` so cold reloads preserve logged meals in real mode.
2. **Abstain Candidate Selection Banner:** Removed premature "Öğün bugüne eklendi" banner when transitioning from Abstention to Review upon candidate selection.
3. **Client User Id Scoping:** Added `X-User-Id` header to mobile API requests to avoid sharing the global `demo-user` idempotency and rate limit bucket.
4. **GDPR User Data Purge:** Added `purgeUserData` in `MealsService` to clear user-specific cached meals, and updated `InMemoryRateLimiter.reset(key)` to reset per-user rate limit rather than global state.
5. **Typed 422 for Fixture Text:** Handled text-only requests in fixture mode with a clean, typed `422 Unprocessable Entity` rather than an unhandled 500 error.
6. **Documentation & Metrics Alignment:**
   - Updated `docs/comparison.md` catalogue counts (103 total, 57 Turkish) and commit SHA (`fcb53d4`).
   - Updated `docs/submission_email_draft.md` EXIF/GPS scrubbing location to Edge/Server-side.
   - Harmonized mobile verification wording in `README.md`.

## Traps
- `FixtureVision` is strictly designed for recorded fixture replay (D5); text-only requests in fixture mode should return typed 422 explaining that live provider is required for free-text logging.
- When updating `upsertMeal` in `App.tsx`, keep the replacement return expression verbatim to satisfy regex contracts in mobile test suites.
