"use strict";
/**
 * Unit tests for the observability primitives.
 *
 * These assert the properties that make a log line useful rather than the
 * wording of any message: that a request id is present and scoped, that levels
 * are actually filtered, that stage timings are recorded, and that the metrics
 * snapshot is a shape a reader can act on. Asserting on exact strings would
 * make every future field addition a test failure for no safety gained.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const obs_1 = require("../src/obs");
let lines;
(0, vitest_1.beforeEach)(() => {
    lines = [];
    vitest_1.vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
        lines.push(JSON.parse(String(chunk)));
        return true;
    });
    obs_1.metrics.reset();
    (0, obs_1.configure)('info');
});
(0, vitest_1.afterEach)(() => {
    vitest_1.vi.restoreAllMocks();
    (0, obs_1.configure)('info');
});
(0, vitest_1.describe)('log lines', () => {
    (0, vitest_1.it)('emits one JSON object per line', () => {
        (0, obs_1.event)('probe', { config: 'V3' });
        (0, vitest_1.expect)(lines).toHaveLength(1);
        (0, vitest_1.expect)(lines[0]).toMatchObject({ level: 'INFO', msg: 'probe', config: 'V3' });
    });
    (0, vitest_1.it)('stamps every line with an ISO timestamp', () => {
        (0, obs_1.event)('probe');
        (0, vitest_1.expect)(new Date(lines[0].ts).toISOString()).toBe(lines[0].ts);
    });
    (0, vitest_1.it)('marks lines emitted outside a request so they are never mistaken for one', () => {
        (0, obs_1.event)('probe');
        (0, vitest_1.expect)(lines[0].request_id).toBe('-');
        (0, vitest_1.expect)((0, obs_1.currentRequestId)()).toBe('-');
    });
    (0, vitest_1.it)('drops records below the configured level', () => {
        (0, obs_1.configure)('warn');
        obs_1.log.info('quiet');
        obs_1.log.error('loud');
        (0, vitest_1.expect)(lines.map((line) => line.msg)).toEqual(['loud']);
    });
    (0, vitest_1.it)('treats an unknown level name as info rather than silencing the service', () => {
        (0, obs_1.configure)('not-a-level');
        obs_1.log.info('kept');
        (0, vitest_1.expect)(lines.map((line) => line.msg)).toEqual(['kept']);
    });
});
(0, vitest_1.describe)('request id propagation', () => {
    (0, vitest_1.it)('attaches the id to every line inside the scope', () => {
        (0, obs_1.withRequestId)('req-1', () => {
            (0, obs_1.event)('first');
            (0, obs_1.event)('second');
        });
        (0, vitest_1.expect)(lines.map((line) => line.request_id)).toEqual(['req-1', 'req-1']);
    });
    (0, vitest_1.it)('does not leak the id after the scope ends', () => {
        (0, obs_1.withRequestId)('req-1', () => (0, obs_1.event)('inside'));
        (0, obs_1.event)('outside');
        (0, vitest_1.expect)(lines[1].request_id).toBe('-');
    });
    (0, vitest_1.it)('keeps concurrent requests apart across await points', async () => {
        const work = (id) => (0, obs_1.withRequestId)(id, async () => {
            await new Promise((resolve) => setTimeout(resolve, 5));
            (0, obs_1.event)('done', { who: id });
        });
        await Promise.all([work('req-a'), work('req-b')]);
        const seen = new Map(lines.map((line) => [line.who, line.request_id]));
        (0, vitest_1.expect)(seen.get('req-a')).toBe('req-a');
        (0, vitest_1.expect)(seen.get('req-b')).toBe('req-b');
    });
    (0, vitest_1.it)('generates ids that are short enough to read and distinct enough to trust', () => {
        const ids = new Set(Array.from({ length: 500 }, () => (0, obs_1.newRequestId)()));
        (0, vitest_1.expect)(ids.size).toBe(500);
        for (const id of ids)
            (0, vitest_1.expect)(id).toMatch(/^[0-9a-f]{12}$/);
    });
});
(0, vitest_1.describe)('stage timing', () => {
    (0, vitest_1.it)('records a duration and the caller-supplied identity fields', () => {
        (0, obs_1.stage)('retrieval', () => 42, { config: 'V3', provider: 'fixture' });
        (0, vitest_1.expect)(lines[0]).toMatchObject({
            msg: 'stage',
            stage: 'retrieval',
            config: 'V3',
            provider: 'fixture',
        });
        (0, vitest_1.expect)(typeof lines[0].duration_ms).toBe('number');
    });
    (0, vitest_1.it)('returns the wrapped value untouched', async () => {
        (0, vitest_1.expect)((0, obs_1.stage)('sync', () => 'value')).toBe('value');
        await (0, vitest_1.expect)((0, obs_1.stageAsync)('async', () => Promise.resolve('value'))).resolves.toBe('value');
    });
    (0, vitest_1.it)('still records a timing when the stage throws, so failures are not invisible', async () => {
        (0, vitest_1.expect)(() => (0, obs_1.stage)('boom', () => {
            throw new Error('nope');
        })).toThrow('nope');
        await (0, vitest_1.expect)((0, obs_1.stageAsync)('boom-async', () => Promise.reject(new Error('nope')))).rejects.toThrow('nope');
        (0, vitest_1.expect)(lines.filter((line) => line.msg === 'stage')).toHaveLength(2);
        (0, vitest_1.expect)(obs_1.metrics.snapshot().stage_latency.boom.count).toBe(1);
    });
    (0, vitest_1.it)('measures the awaited work, not just the call that starts it', async () => {
        await (0, obs_1.stageAsync)('slow', () => new Promise((resolve) => setTimeout(resolve, 20)));
        (0, vitest_1.expect)(lines[0].duration_ms).toBeGreaterThanOrEqual(15);
    });
});
(0, vitest_1.describe)('metrics snapshot', () => {
    (0, vitest_1.it)('counts requests per route and status', () => {
        obs_1.metrics.observeRequest('POST /v1/meals', 200, 10);
        obs_1.metrics.observeRequest('POST /v1/meals', 200, 20);
        obs_1.metrics.observeRequest('POST /v1/meals', 422, 1);
        (0, vitest_1.expect)(obs_1.metrics.snapshot().requests_total).toEqual({
            'POST /v1/meals 200': 2,
            'POST /v1/meals 422': 1,
        });
    });
    (0, vitest_1.it)('counts the decision, which is the number the product is judged on', () => {
        obs_1.metrics.observeOutcome('auto_accept');
        obs_1.metrics.observeOutcome('review');
        obs_1.metrics.observeOutcome('review');
        (0, vitest_1.expect)(obs_1.metrics.snapshot().outcomes_total).toEqual({ auto_accept: 1, review: 2 });
    });
    (0, vitest_1.it)('summarises latency with percentiles rather than an average', () => {
        for (const value of [10, 20, 30, 40, 50]) {
            obs_1.metrics.observeRequest('POST /v1/meals', 200, value);
        }
        (0, vitest_1.expect)(obs_1.metrics.snapshot().request_latency).toMatchObject({
            count: 5,
            p50_ms: 30,
            max_ms: 50,
        });
    });
    (0, vitest_1.it)('reports nulls, not zeros, before any traffic', () => {
        (0, vitest_1.expect)(obs_1.metrics.snapshot().request_latency).toEqual({
            count: 0,
            p50_ms: null,
            p95_ms: null,
            max_ms: null,
        });
    });
    (0, vitest_1.it)('bounds memory by keeping only the most recent samples', () => {
        for (let index = 0; index < 1200; index += 1) {
            obs_1.metrics.observeRequest('POST /v1/meals', 200, index);
        }
        const latency = obs_1.metrics.snapshot().request_latency;
        (0, vitest_1.expect)(latency.count).toBe(1000);
        // The window slid: the earliest samples are gone, so the floor has moved up.
        (0, vitest_1.expect)(latency.max_ms).toBe(1199);
    });
    (0, vitest_1.it)('keeps stage latencies separate so a regression can be attributed', () => {
        obs_1.metrics.observeStage('vision', 100);
        obs_1.metrics.observeStage('retrieval', 5);
        const stages = obs_1.metrics.snapshot().stage_latency;
        (0, vitest_1.expect)(stages.vision.p50_ms).toBe(100);
        (0, vitest_1.expect)(stages.retrieval.p50_ms).toBe(5);
    });
});
//# sourceMappingURL=obs.test.js.map