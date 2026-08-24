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
const main_1 = require("../src/main");
(0, vitest_1.describe)('POST /v1/meals/correct', () => {
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
    (0, vitest_1.it)('recalculates a count correction and ignores client nutrient values', async () => {
        const initial = await (0, supertest_1.default)(app.getHttpServer())
            .post('/v1/meals')
            .send({ idempotency_key: 'correction-http-count', sample_id: 'tr_0002', locale: 'tr', config: 'V3' });
        (0, vitest_1.expect)(initial.status).toBe(200);
        const initialMeal = initial.body;
        (0, vitest_1.expect)(initialMeal).toMatchObject({ action: 'review' });
        (0, vitest_1.expect)(initialMeal.items[0]).toMatchObject({
            food_id: 'tr.simit',
            quantity: null,
            count_origin: 'vision',
            portion_source: 'catalogue_default',
        });
        const tampered = structuredClone(initialMeal);
        const item = tampered.items[0];
        item.nutrients = { kcal: 99999, protein_g: 99999, carb_g: 99999, fat_g: 99999 };
        item.grams = 99999;
        tampered.totals = { kcal: 99999, protein_g: 99999, carb_g: 99999, fat_g: 99999 };
        const corrected = await (0, supertest_1.default)(app.getHttpServer())
            .post('/v1/meals/correct')
            .send({ meal: tampered, corrections: [{ item_index: 0, quantity: 2, unit: 'adet' }] });
        (0, vitest_1.expect)(corrected.status).toBe(200);
        const correctedMeal = corrected.body;
        (0, vitest_1.expect)(correctedMeal.items[0]).toMatchObject({
            food_id: 'tr.simit',
            quantity: 2,
            unit: 'adet',
            grams: 200,
            grams_p10: 160,
            grams_p90: 250,
            nutrients: { kcal: 658 },
        });
        (0, vitest_1.expect)(correctedMeal.items[0]?.portion_provenance).toContain('user_confirmed');
        (0, vitest_1.expect)(correctedMeal.totals.kcal).toBe(658);
    });
    (0, vitest_1.it)('keeps an unknown count in Review when the user says not sure', async () => {
        const initial = await (0, supertest_1.default)(app.getHttpServer())
            .post('/v1/meals')
            .send({ idempotency_key: 'correction-http-unknown', sample_id: 'tr_0002', locale: 'tr', config: 'V3' });
        const corrected = await (0, supertest_1.default)(app.getHttpServer())
            .post('/v1/meals/correct')
            .send({
            meal: initial.body,
            corrections: [{ item_index: 0, quantity: null, unit: 'adet' }],
        });
        (0, vitest_1.expect)(corrected.status).toBe(200);
        const correctedMeal = corrected.body;
        (0, vitest_1.expect)(correctedMeal).toMatchObject({ action: 'review' });
        (0, vitest_1.expect)(correctedMeal.items[0]).toMatchObject({ quantity: null, grams: 100, grams_p10: 65, grams_p90: 145 });
    });
});
//# sourceMappingURL=corrections.e2e.test.js.map