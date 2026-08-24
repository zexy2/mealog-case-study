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

export class InMemoryRateLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(config: RateLimitConfig = { maxRequests: 30, windowMs: 60_000 }) {
    this.maxRequests = config.maxRequests;
    this.windowMs = config.windowMs;
  }

  /**
   * Checks whether the client key (IP or user ID) is within rate limits.
   */
  check(key: string, now = Date.now()): RateLimitResult {
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

  /** Clears rate limit memory for a specific key, or all keys if none provided */
  reset(key?: string): void {
    if (key) {
      this.hits.delete(key);
    } else {
      this.hits.clear();
    }
  }
}

/** Global default singleton instance (30 requests / minute) */
export const defaultRateLimiter = new InMemoryRateLimiter({
  maxRequests: 30,
  windowMs: 60_000,
});
