"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const rate_limiter_1 = require("../src/app/rate-limiter");
(0, vitest_1.describe)('InMemoryRateLimiter', () => {
    (0, vitest_1.it)('allows requests within threshold and blocks subsequent requests within window', () => {
        const limiter = new rate_limiter_1.InMemoryRateLimiter({
            maxRequests: 3,
            windowMs: 10_000,
        });
        const now = 1_000_000;
        const user = 'user-test-1';
        // 1st request
        const r1 = limiter.check(user, now);
        (0, vitest_1.expect)(r1.allowed).toBe(true);
        (0, vitest_1.expect)(r1.remaining).toBe(2);
        // 2nd request
        const r2 = limiter.check(user, now + 1000);
        (0, vitest_1.expect)(r2.allowed).toBe(true);
        (0, vitest_1.expect)(r2.remaining).toBe(1);
        // 3rd request
        const r3 = limiter.check(user, now + 2000);
        (0, vitest_1.expect)(r3.allowed).toBe(true);
        (0, vitest_1.expect)(r3.remaining).toBe(0);
        // 4th request (should be blocked)
        const r4 = limiter.check(user, now + 3000);
        (0, vitest_1.expect)(r4.allowed).toBe(false);
        (0, vitest_1.expect)(r4.remaining).toBe(0);
        (0, vitest_1.expect)(r4.resetMs).toBe(7000); // 1_000_000 + 10_000 - 1_003_000 = 7000
        // Other user should not be affected
        const rOther = limiter.check('user-test-2', now + 3000);
        (0, vitest_1.expect)(rOther.allowed).toBe(true);
        (0, vitest_1.expect)(rOther.remaining).toBe(2);
        // At 11 seconds (timestamp at +2000 is still in 10s window: 1_011_000 - 10_000 = 1_001_000)
        const rAfterPartial = limiter.check(user, now + 11_000);
        (0, vitest_1.expect)(rAfterPartial.allowed).toBe(true);
        (0, vitest_1.expect)(rAfterPartial.remaining).toBe(1); // 1 old + 1 new = 2 used, 1 remaining
        // After full window expires (15 seconds later, all previous expired)
        const rAfterFull = limiter.check(user, now + 15_000);
        (0, vitest_1.expect)(rAfterFull.allowed).toBe(true);
        (0, vitest_1.expect)(rAfterFull.remaining).toBe(1); // only the +11_000 remains (1_015_000 - 10_000 = 1_005_000)
    });
});
//# sourceMappingURL=rate-limiter.test.js.map