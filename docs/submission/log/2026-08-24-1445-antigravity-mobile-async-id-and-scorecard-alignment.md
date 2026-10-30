# Session Log: Mobile Async Client ID Singleton and Scorecard Documentation Alignment

**Date:** 2026-08-24 14:45
**Agent:** antigravity
**Topic:** mobile-async-id-and-scorecard-alignment
**Issue:** #281

## Accomplished
1. **Mobile Async Client ID Singleton:** In `apps/mobile/src/api.ts`, converted `getClientUserId` into an async singleton promise that awaits `AsyncStorage.getItem` before generating or caching the UUID, eliminating race conditions during initial app load.
2. **Scorecard & Metric Synchronization:** Synchronized all documentation (`README.md`, `docs/evaluation.md`, `docs/comparison.md`) to the exact V3 scorecard facts: **12% coverage (10/80 committed, 70/80 ask), 12.7% MAPE (2/2 scorable rows), 103 canonical foods (57 Turkish, 46 English), and 80 golden fixtures**.
3. **Methodological Context on False Positives:** Documented that 64.4% of counted false positives stem from unmapped recipe ingredients (such as olive oil `us.olive_oil`) in multi-dish references, while 70/80 samples safely abstained and were never committed to the user's log.
4. **Security Boundaries:** Clarified edge rate-limiting (30 req/min), EXIF/GPS scrubbing, and decoupled pixel-level face blurring.

## Traps
- When loading persistent keys asynchronously from storage, always use a memoized singleton promise so concurrent network calls await the same resolution instead of generating duplicate fallback IDs.
