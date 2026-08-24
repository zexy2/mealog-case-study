"use strict";
/**
 * @file rate-limiter.ts
 * In-memory sliding window rate limiter for edge endpoints.
 * Protects LLM inference quotas and prevents DoS exhaustion.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultRateLimiter = exports.InMemoryRateLimiter = void 0;
class InMemoryRateLimiter {
    hits = new Map();
    maxRequests;
    windowMs;
    constructor(config = { maxRequests: 30, windowMs: 60_000 }) {
        this.maxRequests = config.maxRequests;
        this.windowMs = config.windowMs;
    }
    /**
     * Checks whether the client key (IP or user ID) is within rate limits.
     */
    check(key, now = Date.now()) {
        const windowStart = now - this.windowMs;
        const timestamps = this.hits.get(key) ?? [];
        // Filter out timestamps outside current sliding window
        const validTimestamps = timestamps.filter((t) => t > windowStart);
        if (validTimestamps.length >= this.maxRequests) {
            const oldestValid = validTimestamps[0];
            const resetMs = Math.max(0, oldestValid + this.windowMs - now);
            return {
                allowed: false,
                remaining: 0,
                resetMs,
            };
        }
        validTimestamps.push(now);
        this.hits.set(key, validTimestamps);
        return {
            allowed: true,
            remaining: this.maxRequests - validTimestamps.length,
            resetMs: this.windowMs,
        };
    }
    /** Clears all rate limit memory (useful for testing) */
    reset() {
        this.hits.clear();
    }
}
exports.InMemoryRateLimiter = InMemoryRateLimiter;
/** Global default singleton instance (30 requests / minute) */
exports.defaultRateLimiter = new InMemoryRateLimiter({
    maxRequests: 30,
    windowMs: 60_000,
});
//# sourceMappingURL=rate-limiter.js.map