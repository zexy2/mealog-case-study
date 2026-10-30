# Session Log: In-flight Race Fingerprint Conflict and Unrecorded Fixture 422 Handling

**Date:** 2026-08-24 14:27
**Agent:** antigravity
**Topic:** inflight-fingerprint-and-fixture-422
**Issue:** #273

## Accomplished
1. **In-flight Race Condition Defense:** Updated `inFlight` map in `MealsService` to store request fingerprints alongside pending promises. Parallel requests sharing the same `idempotency_key` but carrying different payloads now immediately fail with standard `409 Conflict` (`idempotency key reused with different request payload`) instead of improperly sharing in-flight perception results.
2. **Unrecorded Image 422 Conversion:** Added graceful error interception in `MealsService.runOnce` converting missing fixture errors into clean, typed `422 Unprocessable Entity` responses with actionable guidance (`fixture replay has no recorded response for this image; for live photo perception configure VISION_PROVIDER=gemini`) instead of falling back to unhandled 500 errors.
3. **E2E Tests:** Added test cases in `meals.e2e.test.ts` verifying concurrent in-flight race conflict rejection (409) and unrecorded image 422 handling.
4. **Synchronized Documentation:** Updated `README.md` and `docs/submission_email_draft.md` with 287 passing Vitest tests.
5. **Quality Gates:** 287 Vitest tests passing, 289 Python parity tests passing, 0 lint errors, 0 invariant violations.

## Traps
- Always pair in-flight deduplication promises with request fingerprints; key-only maps create subtle data corruption vulnerabilities under parallel burst traffic.
