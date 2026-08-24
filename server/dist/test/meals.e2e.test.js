"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const testing_1 = require("@nestjs/testing");
const supertest_1 = __importDefault(require("supertest"));
const vitest_1 = require("vitest");
const app_module_1 = require("../src/app/app.module");
const config_1 = require("../src/config");
const models_1 = require("../src/domain/models");
const main_1 = require("../src/main");
const vision_gemini_1 = require("../src/adapters/vision.gemini");
const meals_service_1 = require("../src/app/meals.service");
(0, vitest_1.describe)('POST /v1/meals', () => {
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
    (0, vitest_1.it)('accepts JSON fixture input and replays an idempotent result', async () => {
        const body = {
            idempotency_key: 'http-json-replay',
            sample_id: 'tr_0001',
            locale: 'tr',
            config: 'V3',
        };
        const first = await (0, supertest_1.default)(app.getHttpServer()).post('/v1/meals').send(body);
        const second = await (0, supertest_1.default)(app.getHttpServer()).post('/v1/meals').send(body);
        (0, vitest_1.expect)(first.status).toBe(200);
        (0, vitest_1.expect)(second.status).toBe(200);
        (0, vitest_1.expect)(second.body).toEqual(first.body);
        (0, vitest_1.expect)(first.body).toMatchObject({
            idempotency_key: 'http-json-replay',
            config: 'V3',
            degraded: false,
        });
    });
    (0, vitest_1.it)('serializes provider degradation and keeps a high-confidence fallback in review', async () => {
        const moduleRef = await testing_1.Test.createTestingModule({ imports: [app_module_1.AppModule] })
            .overrideProvider(meals_service_1.VISION_PORT)
            .useValue({
            name: 'degraded-stub',
            perceive: () => ({
                observations: [
                    (0, models_1.makePerceivedItem)({
                        surface_form: 'scrambled eggs',
                        confidence: 1,
                        portion_hint: 'one serving',
                    }),
                ],
                degraded: true,
            }),
        })
            .compile();
        const degradedApp = moduleRef.createNestApplication({ bodyParser: false });
        (0, main_1.configureBodyParsers)(degradedApp);
        await degradedApp.init();
        const response = await (0, supertest_1.default)(degradedApp.getHttpServer())
            .post('/v1/meals')
            .send({
            idempotency_key: 'http-degraded-fallback',
            locale: 'en_US',
            config: 'V3',
            text: 'scrambled eggs',
        });
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(response.body).toMatchObject({
            degraded: true,
            action: 'review',
            items: [{ food_id: 'us.eggs_scrambled', confidence: 1 }],
        });
        await degradedApp.close();
    });
    (0, vitest_1.it)('maps an injected provider timeout to a typed 503 response', async () => {
        const moduleRef = await testing_1.Test.createTestingModule({ imports: [app_module_1.AppModule] })
            .overrideProvider(meals_service_1.VISION_PORT)
            .useValue({
            name: 'timeout-stub',
            perceive: () => { throw new vision_gemini_1.VisionProviderError('provider_timeout', 3); },
        })
            .compile();
        const timeoutApp = moduleRef.createNestApplication({ bodyParser: false });
        (0, main_1.configureBodyParsers)(timeoutApp);
        await timeoutApp.init();
        const response = await (0, supertest_1.default)(timeoutApp.getHttpServer())
            .post('/v1/meals')
            .send({ idempotency_key: 'http-provider-timeout', locale: 'en_US', text: 'scrambled eggs' });
        (0, vitest_1.expect)(response.status).toBe(503);
        (0, vitest_1.expect)(response.body).toEqual({
            detail: 'vision provider timeout',
            category: 'provider_timeout',
            retry_attempted: true,
            attempts: 3,
        });
        await timeoutApp.close();
    });
    (0, vitest_1.it)('keeps a non-provider exception at the internal 500 boundary', async () => {
        const moduleRef = await testing_1.Test.createTestingModule({ imports: [app_module_1.AppModule] })
            .overrideProvider(meals_service_1.VISION_PORT)
            .useValue({
            name: 'defect-stub',
            perceive: () => { throw new Error('internal defect'); },
        })
            .compile();
        const defectApp = moduleRef.createNestApplication({ bodyParser: false });
        (0, main_1.configureBodyParsers)(defectApp);
        await defectApp.init();
        const response = await (0, supertest_1.default)(defectApp.getHttpServer())
            .post('/v1/meals')
            .send({ idempotency_key: 'http-internal-defect', locale: 'en_US', text: 'scrambled eggs' });
        (0, vitest_1.expect)(response.status).toBe(500);
        (0, vitest_1.expect)(response.body).toEqual({ detail: 'Internal Server Error' });
        await defectApp.close();
    });
    (0, vitest_1.it)('accepts multipart form fields without an image for fixture replay', async () => {
        const response = await (0, supertest_1.default)(app.getHttpServer())
            .post('/v1/meals')
            .field('idempotency_key', 'http-multipart-fixture')
            .field('sample_id', 'tr_0002')
            .field('locale', 'tr')
            .field('config', 'V3');
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(response.body).toMatchObject({ idempotency_key: 'http-multipart-fixture', locale: 'tr' });
    });
    (0, vitest_1.it)('scopes the same idempotency key by X-User-Id', async () => {
        const first = await (0, supertest_1.default)(app.getHttpServer())
            .post('/v1/meals')
            .set('X-User-Id', 'user-a')
            .send({ idempotency_key: 'http-shared-key', sample_id: 'tr_0001', locale: 'tr' });
        const second = await (0, supertest_1.default)(app.getHttpServer())
            .post('/v1/meals')
            .set('X-User-Id', 'user-b')
            .send({ idempotency_key: 'http-shared-key', sample_id: 'tr_0002', locale: 'tr' });
        (0, vitest_1.expect)(first.status).toBe(200);
        (0, vitest_1.expect)(second.status).toBe(200);
        (0, vitest_1.expect)(first.body).not.toEqual(second.body);
    });
    (0, vitest_1.it)('validates the V0-V3 config set and rejects unknown configs with 422', async () => {
        for (const config of ['V0', 'V1', 'V2', 'V3']) {
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/v1/meals')
                .send({ idempotency_key: `http-config-${config}`, sample_id: 'tr_0001', locale: 'tr', config });
            (0, vitest_1.expect)(response.status).toBe(200);
        }
        const unknown = await (0, supertest_1.default)(app.getHttpServer())
            .post('/v1/meals')
            .send({ idempotency_key: 'http-config-unknown', sample_id: 'tr_0001', config: 'V9' });
        (0, vitest_1.expect)(unknown.status).toBe(422);
        (0, vitest_1.expect)(unknown.body).toEqual({
            detail: "unknown config 'V9'; expected one of: V0, V1, V2, V3",
        });
    });
    (0, vitest_1.it)('rejects unsupported image MIME types with the Python-compatible 415', async () => {
        const response = await (0, supertest_1.default)(app.getHttpServer())
            .post('/v1/meals')
            .field('idempotency_key', 'http-bad-mime')
            .attach('image', Buffer.from('not an image'), { filename: 'meal.txt', contentType: 'text/plain' });
        (0, vitest_1.expect)(response.status).toBe(415);
        (0, vitest_1.expect)(response.body).toEqual({ detail: 'unsupported image content type' });
    });
    (0, vitest_1.it)('rejects MIME-spoofed image bytes before provider handling', async () => {
        const response = await (0, supertest_1.default)(app.getHttpServer())
            .post('/v1/meals')
            .field('idempotency_key', 'http-spoofed-image')
            .attach('image', Buffer.from('not a JPEG'), { filename: 'meal.jpg', contentType: 'image/jpeg' });
        (0, vitest_1.expect)(response.status).toBe(415);
        (0, vitest_1.expect)(response.body).toEqual({ detail: 'unsupported image content' });
    });
    (0, vitest_1.it)('rejects an image over 10 MiB with the Python-compatible 413', async () => {
        const response = await (0, supertest_1.default)(app.getHttpServer())
            .post('/v1/meals')
            .field('idempotency_key', 'http-large-image')
            .attach('image', Buffer.alloc(10 * 1024 * 1024 + 1), {
            filename: 'meal.jpg',
            contentType: 'image/jpeg',
        });
        (0, vitest_1.expect)(response.status).toBe(413);
        (0, vitest_1.expect)(response.body).toEqual({ detail: 'image exceeds 10 MiB limit' });
    });
    (0, vitest_1.it)('returns 422 for a JSON request without an input source', async () => {
        const response = await (0, supertest_1.default)(app.getHttpServer())
            .post('/v1/meals')
            .send({ idempotency_key: 'http-no-input' });
        (0, vitest_1.expect)(response.status).toBe(422);
        (0, vitest_1.expect)(response.body).toEqual({ detail: 'request needs image, text, or sample_id' });
    });
    (0, vitest_1.it)('rejects sample_id when the configured provider is live', async () => {
        const moduleRef = await testing_1.Test.createTestingModule({ imports: [app_module_1.AppModule] })
            .overrideProvider(config_1.Settings)
            .useValue(new config_1.Settings({ VISION_PROVIDER: 'gemini', GEMINI_API_KEY: 'test-key' }))
            .overrideProvider(meals_service_1.VISION_PORT)
            .useValue({ name: 'stub', perceive: () => { throw new Error('vision should not run'); } })
            .compile();
        const liveApp = moduleRef.createNestApplication({ bodyParser: false });
        (0, main_1.configureBodyParsers)(liveApp);
        await liveApp.init();
        const response = await (0, supertest_1.default)(liveApp.getHttpServer())
            .post('/v1/meals')
            .send({ idempotency_key: 'http-live-sample', sample_id: 'tr_0001' });
        (0, vitest_1.expect)(response.status).toBe(400);
        (0, vitest_1.expect)(response.body).toEqual({
            detail: 'sample_id is test-only; live provider needs image or text input',
        });
        await liveApp.close();
    });
    (0, vitest_1.it)('maps malformed JSON to the Python-compatible 422', async () => {
        const response = await (0, supertest_1.default)(app.getHttpServer())
            .post('/v1/meals')
            .set('content-type', 'application/json')
            .send('{"idempotency_key":');
        (0, vitest_1.expect)(response.status).toBe(422);
        (0, vitest_1.expect)(response.body).toEqual({ detail: 'invalid JSON request' });
    });
    (0, vitest_1.it)('keeps the existing 413 and 422 boundaries after provider-error mapping', async () => {
        const tooLarge = await (0, supertest_1.default)(app.getHttpServer())
            .post('/v1/meals')
            .field('idempotency_key', 'http-provider-error-large-image')
            .attach('image', Buffer.alloc(10 * 1024 * 1024 + 1), {
            filename: 'meal.jpg',
            contentType: 'image/jpeg',
        });
        const malformed = await (0, supertest_1.default)(app.getHttpServer())
            .post('/v1/meals')
            .set('content-type', 'application/json')
            .send('{"idempotency_key":');
        (0, vitest_1.expect)(tooLarge.status).toBe(413);
        (0, vitest_1.expect)(tooLarge.body).toEqual({ detail: 'image exceeds 10 MiB limit' });
        (0, vitest_1.expect)(malformed.status).toBe(422);
        (0, vitest_1.expect)(malformed.body).toEqual({ detail: 'invalid JSON request' });
    });
});
//# sourceMappingURL=meals.e2e.test.js.map