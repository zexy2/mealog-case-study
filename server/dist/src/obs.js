"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metrics = exports.log = void 0;
exports.configure = configure;
exports.currentRequestId = currentRequestId;
exports.newRequestId = newRequestId;
exports.withRequestId = withRequestId;
exports.event = event;
exports.stage = stage;
exports.stageAsync = stageAsync;
/**
 * Observability for the delivered service, deliberately small.
 *
 * The brief asks for "logging/metrics/traces (simple is fine)", so this is one
 * structured JSON logger, a request id that reaches the client, an in-process
 * metrics registry, and a per-stage timer. Every record carries `request_id`
 * and the identity of what produced it (config, provider, locale) — without
 * those, a metric change cannot be attributed to a cause, which is the only
 * reason to log at all.
 *
 * This is the TypeScript counterpart of `src/mealog/obs.py`; the two are kept
 * shaped alike so a log line from either runtime reads the same. A full OTel
 * pipeline and a durable metrics backend are listed under "with more time",
 * not built: the registry below is process-local and resets on restart, which
 * is honest for a single-instance case study and wrong for production.
 *
 * Framework-free on purpose. `AsyncLocalStorage` is Node core, not Nest, so
 * the pipeline can import this without booting the edge.
 */
const node_async_hooks_1 = require("node:async_hooks");
const node_crypto_1 = require("node:crypto");
const storage = new node_async_hooks_1.AsyncLocalStorage();
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
function thresholdFrom(level) {
    return LEVELS[level.trim().toLowerCase()] ?? LEVELS.info;
}
let threshold = thresholdFrom(process.env.LOG_LEVEL ?? 'info');
/** Set the minimum level that is emitted. Mirrors `obs.configure` in Python. */
function configure(level) {
    threshold = thresholdFrom(level);
}
/** The request id of the active context, or `-` outside a request. */
function currentRequestId() {
    return storage.getStore()?.requestId ?? '-';
}
function newRequestId() {
    return (0, node_crypto_1.randomUUID)().replace(/-/g, '').slice(0, 12);
}
/** Run `fn` with `requestId` attached to every log line it produces. */
function withRequestId(requestId, fn) {
    return storage.run({ requestId }, fn);
}
function emit(level, msg, fields) {
    if ((LEVELS[level] ?? LEVELS.info) < threshold)
        return;
    const payload = {
        ts: new Date().toISOString(),
        level: level.toUpperCase(),
        msg,
        request_id: currentRequestId(),
        ...fields,
    };
    // One line, one event. Stdout is the transport; the container collects it.
    process.stdout.write(`${JSON.stringify(payload)}\n`);
}
exports.log = {
    debug: (msg, fields = {}) => emit('debug', msg, fields),
    info: (msg, fields = {}) => emit('info', msg, fields),
    warn: (msg, fields = {}) => emit('warn', msg, fields),
    error: (msg, fields = {}) => emit('error', msg, fields),
};
/** Emit a single structured event at info level. */
function event(msg, fields = {}) {
    emit('info', msg, fields);
}
/**
 * Time one pipeline stage. Stage timings are the cheapest useful trace: they
 * say whether a latency regression is retrieval or the provider.
 */
function stage(name, fn, fields = {}) {
    const started = performance.now();
    try {
        return fn();
    }
    finally {
        const durationMs = Number((performance.now() - started).toFixed(2));
        event('stage', { stage: name, duration_ms: durationMs, ...fields });
        exports.metrics.observeStage(name, durationMs);
    }
}
/** Async variant of {@link stage}, for provider calls and handlers. */
async function stageAsync(name, fn, fields = {}) {
    const started = performance.now();
    try {
        return await fn();
    }
    finally {
        const durationMs = Number((performance.now() - started).toFixed(2));
        event('stage', { stage: name, duration_ms: durationMs, ...fields });
        exports.metrics.observeStage(name, durationMs);
    }
}
function quantile(sorted, q) {
    if (sorted.length === 0)
        return null;
    const rank = q * (sorted.length - 1);
    const low = Math.floor(rank);
    const high = Math.ceil(rank);
    const value = low === high
        ? sorted[low]
        : sorted[low] + (sorted[high] - sorted[low]) * (rank - low);
    return Number(value.toFixed(2));
}
/**
 * Process-local metrics. Bounded on purpose: a case study should not grow
 * unboundedly in memory to serve a counter, and an unbounded sample would be
 * the wrong thing to trust anyway.
 */
const MAX_SAMPLES = 1000;
class Metrics {
    startedAt = Date.now();
    requests = new Map();
    outcomes = new Map();
    requestLatency = [];
    stageLatency = new Map();
    static push(samples, value) {
        samples.push(value);
        if (samples.length > MAX_SAMPLES)
            samples.shift();
    }
    static bump(counter, key) {
        counter.set(key, (counter.get(key) ?? 0) + 1);
    }
    /** One finished HTTP request: route, status class, and total duration. */
    observeRequest(route, status, durationMs) {
        Metrics.bump(this.requests, `${route} ${status}`);
        Metrics.push(this.requestLatency, durationMs);
    }
    /**
     * One pipeline outcome. `commit` / `ask` / `abstain` is the number that
     * matters for this product: it is the coverage/abstention split the
     * scorecard reports offline, observed here on live traffic.
     */
    observeOutcome(action) {
        Metrics.bump(this.outcomes, action);
    }
    observeStage(name, durationMs) {
        const samples = this.stageLatency.get(name) ?? [];
        Metrics.push(samples, durationMs);
        this.stageLatency.set(name, samples);
    }
    static summarize(samples) {
        const sorted = [...samples].sort((a, b) => a - b);
        return {
            count: sorted.length,
            p50_ms: quantile(sorted, 0.5),
            p95_ms: quantile(sorted, 0.95),
            max_ms: sorted.length > 0 ? Number(sorted[sorted.length - 1].toFixed(2)) : null,
        };
    }
    snapshot() {
        const stages = {};
        for (const [name, samples] of this.stageLatency) {
            stages[name] = Metrics.summarize(samples);
        }
        return {
            uptime_s: Math.round((Date.now() - this.startedAt) / 1000),
            requests_total: Object.fromEntries(this.requests),
            outcomes_total: Object.fromEntries(this.outcomes),
            request_latency: Metrics.summarize(this.requestLatency),
            stage_latency: stages,
        };
    }
    /** Test-only reset so metric assertions do not leak across cases. */
    reset() {
        this.requests.clear();
        this.outcomes.clear();
        this.requestLatency.length = 0;
        this.stageLatency.clear();
    }
}
exports.metrics = new Metrics();
//# sourceMappingURL=obs.js.map