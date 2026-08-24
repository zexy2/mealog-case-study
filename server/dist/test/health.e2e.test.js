"use strict";
/**
 * Boots the real Nest application and drives it over HTTP.
 *
 * This is the check that the edge actually starts: a unit test on the
 * controller class would pass even if the module graph were broken, which is
 * the failure that would block every later wave.
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
(0, vitest_1.describe)('GET /health', () => {
    let app;
    let server;
    (0, vitest_1.beforeAll)(async () => {
        const moduleRef = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
        }).compile();
        app = moduleRef.createNestApplication();
        await app.init();
        server = app.getHttpServer();
    });
    (0, vitest_1.afterAll)(async () => {
        await app?.close();
    });
    (0, vitest_1.it)('returns 200', async () => {
        const response = await (0, supertest_1.default)(server).get('/health');
        (0, vitest_1.expect)(response.status).toBe(200);
    });
    (0, vitest_1.it)('reports the service as up', async () => {
        const response = await (0, supertest_1.default)(server).get('/health');
        (0, vitest_1.expect)(response.body).toEqual({ status: 'ok', vision: 'fixture' });
    });
    (0, vitest_1.it)('404s an unknown route, proving routing is real and not a catch-all', async () => {
        const response = await (0, supertest_1.default)(server).get('/health/nope');
        (0, vitest_1.expect)(response.status).toBe(404);
    });
});
//# sourceMappingURL=health.e2e.test.js.map