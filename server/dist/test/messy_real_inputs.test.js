"use strict";
/**
 * @file messy_real_inputs.test.ts
 * Evaluation and verification test suite for realistic, messy, multi-item dining images.
 * Tests multi-component plate perception, Turkish food catalog grounding, and confidence gating.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const models_1 = require("../src/domain/models");
const ports_1 = require("../src/pipeline/ports");
const runner_1 = require("../src/pipeline/runner");
const loader_1 = require("../src/locales/loader");
(0, vitest_1.describe)('Messy Real-World Multi-Item Food Tests', () => {
    (0, vitest_1.it)('verifies Turkish pack loaded and has rich multi-item food coverage', () => {
        const pack = (0, loader_1.load)('tr');
        (0, vitest_1.expect)(pack.foods['tr.menemen']).toBeDefined();
        (0, vitest_1.expect)(pack.foods['tr.pilav']).toBeDefined();
        (0, vitest_1.expect)(pack.foods['tr.kuru_fasulye']).toBeDefined();
        (0, vitest_1.expect)(pack.foods['tr.ayran']).toBeDefined();
        (0, vitest_1.expect)(pack.foods['tr.domates']).toBeDefined();
        (0, vitest_1.expect)(pack.foods['tr.patates']).toBeDefined();
        (0, vitest_1.expect)(pack.foods['tr.edirne_beyaz_peyniri']).toBeDefined();
    });
    (0, vitest_1.it)('properly resolves multi-item text and calculates accurate un-hallucinated nutrition', async () => {
        const fakeVision = {
            name: 'fake_vision',
            perceive: () => Promise.resolve({
                observations: [
                    (0, models_1.makePerceivedItem)({ surface_form: 'kuru fasulye', cooking_method: 'stewed', portion_hint: '1 kase', count: 1, confidence: 0.95 }),
                    (0, models_1.makePerceivedItem)({ surface_form: 'pirinc pilavi', cooking_method: 'boiled', portion_hint: '1 porsiyon', count: 1, confidence: 0.92 }),
                    (0, models_1.makePerceivedItem)({ surface_form: 'yogurt', cooking_method: 'plain', portion_hint: '1 kase', count: 1, confidence: 0.9 }),
                    (0, models_1.makePerceivedItem)({ surface_form: 'ekmek', cooking_method: 'baked', portion_hint: '2 dilim', count: 2, confidence: 0.96 }),
                ],
                degraded: false,
            }),
        };
        const meal = await (0, runner_1.run)(fakeVision, new ports_1.VisionInput({ text: 'kuru fasulye pilav yogurt ekmek' }), 'tr', runner_1.CONFIGS.V3, 'test-messy-lunch');
        (0, vitest_1.expect)(meal.items.length).toBe(4);
        (0, vitest_1.expect)(meal.items[0].food_id).toBe('tr.kuru_fasulye');
        (0, vitest_1.expect)(meal.items[1].food_id).toBe('tr.pilav');
        (0, vitest_1.expect)(meal.items[2].food_id).toBe('tr.yogurt_tam_yagli');
        (0, vitest_1.expect)(meal.items[3].food_id).toBe('tr.ekmek_beyaz');
        // Nutrition must be computed exclusively from ground-truth catalogue
        (0, vitest_1.expect)(meal.totals.kcal).toBeGreaterThan(500);
        (0, vitest_1.expect)(meal.totals.protein_g).toBeGreaterThan(20);
        (0, vitest_1.expect)(['auto_accept', 'ask', 'review']).toContain(meal.action);
    });
    (0, vitest_1.it)('evaluates multi-item breakfast perception and abstains on out-of-catalog items gracefully', async () => {
        const fakeVision = {
            name: 'fake_vision',
            perceive: () => Promise.resolve({
                observations: [
                    (0, models_1.makePerceivedItem)({ surface_form: 'menemen', cooking_method: 'pan-fried', portion_hint: '1 porsiyon', count: 1, confidence: 0.95 }),
                    (0, models_1.makePerceivedItem)({ surface_form: 'beyaz peynir', cooking_method: 'raw', portion_hint: '2 dilim', count: 2, confidence: 0.93 }),
                    (0, models_1.makePerceivedItem)({ surface_form: 'siyah zeytin', cooking_method: 'cured', portion_hint: '1 porsiyon', count: 1, confidence: 0.91 }),
                    (0, models_1.makePerceivedItem)({ surface_form: 'domates', cooking_method: 'raw', portion_hint: '1 adet', count: 1, confidence: 0.94 }),
                    (0, models_1.makePerceivedItem)({ surface_form: 'avokado tostu', cooking_method: 'toasted', portion_hint: '1 dilim', count: 1, confidence: 0.88 }),
                ],
                degraded: false,
            }),
        };
        const meal = await (0, runner_1.run)(fakeVision, new ports_1.VisionInput({ text: 'serpme kahvalti' }), 'tr', runner_1.CONFIGS.V3, 'test-messy-breakfast');
        (0, vitest_1.expect)(meal.items.length).toBe(5);
        (0, vitest_1.expect)(meal.items[0].food_id).toBe('tr.menemen');
        (0, vitest_1.expect)(meal.items[1].food_id).toBe('tr.edirne_beyaz_peyniri');
        (0, vitest_1.expect)(meal.items[2].food_id).toBe('tr.zeytin_siyah');
        (0, vitest_1.expect)(meal.items[3].food_id).toBe('tr.domates');
        (0, vitest_1.expect)(meal.items[4].food_id).toBe('ABSTAIN'); // D1 anti-hallucination guarantee holds!
        (0, vitest_1.expect)(meal.action).toBe('ask');
    });
});
//# sourceMappingURL=messy_real_inputs.test.js.map