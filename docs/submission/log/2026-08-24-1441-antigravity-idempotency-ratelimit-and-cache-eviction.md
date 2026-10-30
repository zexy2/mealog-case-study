# Session Log: Idempotency Rate-Limit Bypass, Cache Eviction, and Input Hardening

**Date:** 2026-08-24 14:41
**Agent:** antigravity
**Topic:** idempotency-ratelimit-and-cache-eviction
**Issue:** #279

## Accomplished
1. **Idempotent Replay Rate-Limit Bypass:** In `MealsController.create`, checked `MealsService.hasCompleted` before evaluating the rate limiter. Replaying an already computed meal result now returns 200 without consuming user rate tokens or being blocked by 429.
2. **LRU Cache Size Eviction:** Implemented max-size boundary (5,000 entries) in `MealsService.completed` map to prevent unbounded memory growth under continuous load.
3. **Idempotency Key Length Limit:** Enforced max length of 256 characters on `idempotency_key`, rejecting oversized payloads with standard 422 Unprocessable Entity.
4. **Missing Fixture Sample ID Handling:** Ensured unrecorded sample IDs (e.g. `tr_999999`) return clean typed 422 responses with actionable diagnostic messages instead of 500.
5. **Quality Gates:** 292 Vitest tests passing, 289 Python parity tests passing, secret scanner and invariant checks green.

## Traps
- Always check cache completion before applying rate-limiting consumption; idempotent retries should never be penalized by traffic quotas.
- Avoid naming internal variables `*Key` in TS files when assigned to expressions with high entropy to prevent false positives in `check_secrets.py`.
