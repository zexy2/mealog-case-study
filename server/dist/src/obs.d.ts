export interface LogFields {
    readonly [key: string]: unknown;
}
/** Set the minimum level that is emitted. Mirrors `obs.configure` in Python. */
export declare function configure(level: string): void;
/** The request id of the active context, or `-` outside a request. */
export declare function currentRequestId(): string;
export declare function newRequestId(): string;
/** Run `fn` with `requestId` attached to every log line it produces. */
export declare function withRequestId<T>(requestId: string, fn: () => T): T;
export declare const log: {
    debug: (msg: string, fields?: LogFields) => void;
    info: (msg: string, fields?: LogFields) => void;
    warn: (msg: string, fields?: LogFields) => void;
    error: (msg: string, fields?: LogFields) => void;
};
/** Emit a single structured event at info level. */
export declare function event(msg: string, fields?: LogFields): void;
/**
 * Time one pipeline stage. Stage timings are the cheapest useful trace: they
 * say whether a latency regression is retrieval or the provider.
 */
export declare function stage<T>(name: string, fn: () => T, fields?: LogFields): T;
/** Async variant of {@link stage}, for provider calls and handlers. */
export declare function stageAsync<T>(name: string, fn: () => Promise<T>, fields?: LogFields): Promise<T>;
export interface LatencySummary {
    readonly count: number;
    readonly p50_ms: number | null;
    readonly p95_ms: number | null;
    readonly max_ms: number | null;
}
export interface MetricsSnapshot {
    readonly uptime_s: number;
    readonly requests_total: Record<string, number>;
    readonly outcomes_total: Record<string, number>;
    readonly request_latency: LatencySummary;
    readonly stage_latency: Record<string, LatencySummary>;
}
declare class Metrics {
    private readonly startedAt;
    private readonly requests;
    private readonly outcomes;
    private readonly requestLatency;
    private readonly stageLatency;
    private static push;
    private static bump;
    /** One finished HTTP request: route, status class, and total duration. */
    observeRequest(route: string, status: number, durationMs: number): void;
    /**
     * One pipeline outcome. `commit` / `ask` / `abstain` is the number that
     * matters for this product: it is the coverage/abstention split the
     * scorecard reports offline, observed here on live traffic.
     */
    observeOutcome(action: string): void;
    observeStage(name: string, durationMs: number): void;
    private static summarize;
    snapshot(): MetricsSnapshot;
    /** Test-only reset so metric assertions do not leak across cases. */
    reset(): void;
}
export declare const metrics: Metrics;
export {};
