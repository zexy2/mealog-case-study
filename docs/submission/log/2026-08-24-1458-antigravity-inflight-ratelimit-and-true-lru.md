# Session Log: In-Flight Rate-Limit Bypass and True LRU Eviction

**Date:** 2026-08-24 14:58
**Agent:** antigravity
**Topic:** inflight-ratelimit-and-true-lru
**Issue:** #285

## Accomplished
1. **In-Flight Idempotency Rate-Limit Bypass:** In `MealsController.create`, used `this.meals.hasPendingOrCompleted` instead of just `hasCompleted`. Burst requests on the same `idempotency_key` arriving while the first request is still in-flight bypass rate-limit token consumption and attach to the single pending promise.
2. **True LRU Splay on Cache Hits:** When `MealsService.logMeal` encounters a cache hit, the entry is re-inserted to move it to the end of the `Map` insertion order, preventing frequently used records from being evicted.
3. **Decisions.md Trailing Whitespace:** Cleaned up EOF trailing blank line in `docs/decisions.md`.
4. **All Quality Gates Green:** 292 Vitest tests passing, 289 Python parity tests passing, secret scanner and invariant checks passing.

## Traps
- Always check both `inFlight` and `completed` when checking idempotency before rate limit token decrementing to avoid dropping concurrent burst requests for slow providers.
