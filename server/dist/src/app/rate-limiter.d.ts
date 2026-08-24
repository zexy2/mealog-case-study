/**
 * @file rate-limiter.ts
 * In-memory sliding window rate limiter for edge endpoints.
 * Protects LLM inference quotas and prevents DoS exhaustion.
 */
export interface RateLimitConfig {
    readonly maxRequests: number;
    readonly windowMs: number;
}
export interface RateLimitResult {
    readonly allowed: boolean;
    readonly remaining: number;
    readonly resetMs: number;
}
export declare class InMemoryRateLimiter {
    private readonly hits;
    private readonly maxRequests;
    private readonly windowMs;
    constructor(config?: RateLimitConfig);
    /**
     * Checks whether the client key (IP or user ID) is within rate limits.
     */
    check(key: string, now?: number): RateLimitResult;
    /** Clears all rate limit memory (useful for testing) */
    reset(): void;
}
/** Global default singleton instance (30 requests / minute) */
export declare const defaultRateLimiter: InMemoryRateLimiter;
