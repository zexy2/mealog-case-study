"use strict";
/**
 * Drives the real application over HTTP to check the observability wiring.
 *
 * The unit tests in `obs.test.ts` prove the primitives work; these prove they
 * are actually connected — that the interceptor is registered globally, that
 * the id reaches the client, and that `/metrics` reports traffic that really
 * happened. A green unit suite with an unregistered interceptor is exactly the
 * failure this file exists to catch.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const testing_1 = require("@nestjs/testing");
const supertest_1 = __importDefault(require("supertest"));
const vitest_1 = require("vitest");
const app_module_1 = require("../src/app/app.module");
const main_1 = require("../src/main");
const obs_1 = require("../src/obs");
(0, vitest_1.describe)('observability at the edge', () => {
    let app;
    (0, vitest_1.beforeAll)(async () => {
        const moduleRef = await testing_1.Test.createTestingModule({ imports: [app_module_1.AppModule] }).compile();
        app = moduleRef.createNestApplication({ bodyParser: false });
        (0, main_1.configureBodyParsers)(app);
        await app.init();
    });
    (0, vitest_1.afterAll)(async () => {
        await app?.close();
    });
    (0, vitest_1.beforeEach)(() => {
        obs_1.metrics.reset();
    });
    const logMeal = (body) => (0, supertest_1.default)(app.getHttpServer()).post('/v1/meals').send(body);
    const snapshot = async () => {
        const response = await (0, supertest_1.default)(app.getHttpServer()).get('/metrics');
        (0, vitest_1.expect)(response.status).toBe(200);
        return response.body;
    };
    (0, vitest_1.it)('returns a request id the caller can quote in a support ticket', async () => {
        const response = await (0, supertest_1.default)(app.getHttpServer()).get('/health');
        (0, vitest_1.expect)(response.headers['x-request-id']).toMatch(/^[0-9a-f]{12}$/);
    });
    (0, vitest_1.it)('gives different requests different ids', async () => {
        const first = await (0, supertest_1.default)(app.getHttpServer()).get('/health');
        const second = await (0, supertest_1.default)(app.getHttpServer()).get('/health');
        (0, vitest_1.expect)(first.headers['x-request-id']).not.toBe(second.headers['x-request-id']);
    });
    (0, vitest_1.it)('honours a client-supplied id so a mobile trace survives into server logs', async () => {
        const response = await (0, supertest_1.default)(app.getHttpServer())
            .get('/health')
            .set('X-Request-Id', 'client-abc-123');
        (0, vitest_1.expect)(response.headers['x-request-id']).toBe('client-abc-123');
    });
    (0, vitest_1.it)('rejects an absurdly long client id instead of logging it verbatim', async () => {
        const response = await (0, supertest_1.default)(app.getHttpServer())
            .get('/health')
            .set('X-Request-Id', 'x'.repeat(200));
        (0, vitest_1.expect)(response.headers['x-request-id']).toMatch(/^[0-9a-f]{12}$/);
    });
    (0, vitest_1.it)('counts a successful meal under its route and status', async () => {
        await logMeal({
            idempotency_key: 'obs-success',
            sample_id: 'tr_0001',
            locale: 'tr',
            config: 'V3',
        });
        (0, vitest_1.expect)((await snapshot()).requests_total['POST /v1/meals 200']).toBe(1);
    });
    (0, vitest_1.it)('counts a rejected request rather than dropping it from the record', async () => {
        await logMeal({
            idempotency_key: 'obs-bad-config',
            sample_id: 'tr_0001',
            locale: 'tr',
            config: 'V99',
        });
        const requests = (await snapshot()).requests_total;
        (0, vitest_1.expect)(requests['POST /v1/meals 422']).toBe(1);
        (0, vitest_1.expect)(requests['POST /v1/meals 200']).toBeUndefined();
    });
    (0, vitest_1.it)('records the gate decision, not just the status code', async () => {
        await logMeal({
            idempotency_key: 'obs-decision',
            sample_id: 'tr_0001',
            locale: 'tr',
            config: 'V3',
        });
        const outcomes = (await snapshot()).outcomes_total;
        (0, vitest_1.expect)(Object.keys(outcomes)).toHaveLength(1);
        (0, vitest_1.expect)(Object.values(outcomes)[0]).toBe(1);
    });
    (0, vitest_1.it)('times the pipeline stage separately from the request', async () => {
        await logMeal({
            idempotency_key: 'obs-stages',
            sample_id: 'tr_0001',
            locale: 'tr',
            config: 'V3',
        });
        const current = await snapshot();
        (0, vitest_1.expect)(current.stage_latency.pipeline.count).toBe(1);
        (0, vitest_1.expect)(current.request_latency.count).toBeGreaterThanOrEqual(1);
    });
    (0, vitest_1.it)('reports an empty but well-formed snapshot before any traffic', async () => {
        const current = await snapshot();
        (0, vitest_1.expect)(current.outcomes_total).toEqual({});
        (0, vitest_1.expect)(current.request_latency.count).toBe(0);
        (0, vitest_1.expect)(current.request_latency.p50_ms).toBeNull();
        (0, vitest_1.expect)(typeof current.uptime_s).toBe('number');
    });
    (0, vitest_1.it)('exposes only aggregates — no meal contents, no user ids', async () => {
        await logMeal({
            idempotency_key: 'obs-privacy',
            locale: 'en_US',
            config: 'V3',
            text: 'scrambled eggs and toast',
        });
        const serialized = JSON.stringify(await snapshot());
        (0, vitest_1.expect)(serialized).not.toContain('scrambled eggs');
        (0, vitest_1.expect)(serialized).not.toContain('obs-privacy');
        (0, vitest_1.expect)(serialized).not.toContain('demo-user');
    });
});
//# sourceMappingURL=observability.e2e.test.js.map