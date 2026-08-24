"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const models_1 = require("../src/domain/models");
const correction_1 = require("../src/pipeline/correction");
function meal() {
    return (0, models_1.makeMealLog)({
        idempotency_key: 'correction-test',
        locale: 'tr',
        config: 'V3',
        items: [
            (0, models_1.makeResolvedItem)({
                query: 'simit',
                food_id: 'tr.simit',
                candidates: [{ food_id: 'tr.simit', name: 'Simit', score: 1 }],
                quantity: null,
                unit: 'several',
                grams: 100,
                grams_p10: 65,
                grams_p90: 145,
                confidence: 1,
                nutrients: (0, models_1.makeNutrients)({ kcal: 329 }),
            }),
            (0, models_1.makeResolvedItem)({
                query: 'ayran',
                food_id: 'tr.ayran',
                candidates: [{ food_id: 'tr.ayran', name: 'Ayran', score: 1 }],
                quantity: 1,
                unit: 'serving',
                grams: 200,
                grams_p10: 150,
                grams_p90: 270,
                confidence: 1,
                nutrients: (0, models_1.makeNutrients)({ kcal: 74 }),
            }),
        ],
    });
}
function mealWithAbstain() {
    const result = meal();
    result.items.push((0, models_1.makeResolvedItem)({
        query: 'unknown',
        food_id: 'ABSTAIN',
        candidates: [{ food_id: 'tr.simit', name: 'Simit', score: 0.1 }],
        grams: 0,
        grams_p10: 0,
        grams_p90: 0,
        nutrients: (0, models_1.makeNutrients)(),
    }));
    return result;
}
(0, vitest_1.describe)('server-side meal correction', () => {
    (0, vitest_1.it)('recomputes count, band, nutrients and totals while preserving ayran', () => {
        const result = (0, correction_1.applyCorrections)({
            meal: meal(),
            corrections: [{ item_index: 0, quantity: 2, unit: 'adet' }],
        });
        (0, vitest_1.expect)(result.items[0]).toMatchObject({
            food_id: 'tr.simit',
            quantity: 2,
            unit: 'adet',
            grams: 200,
            grams_p10: 160,
            grams_p90: 250,
            nutrients: { kcal: 658 },
        });
        (0, vitest_1.expect)(result.items[0].portion_provenance).toContain('correction=quantity=user_confirmed,unit=user_confirmed');
        (0, vitest_1.expect)(result.items[1]).toMatchObject({
            food_id: 'tr.ayran',
            quantity: 1,
            grams: 200,
            grams_p10: 150,
            grams_p90: 270,
        });
        (0, vitest_1.expect)(result.totals).toEqual({
            kcal: result.items[0].nutrients.kcal + result.items[1].nutrients.kcal,
            protein_g: result.items[0].nutrients.protein_g + result.items[1].nutrients.protein_g,
            carb_g: result.items[0].nutrients.carb_g + result.items[1].nutrients.carb_g,
            fat_g: result.items[0].nutrients.fat_g + result.items[1].nutrients.fat_g,
        });
        (0, vitest_1.expect)(result.action).toBe('review');
    });
    (0, vitest_1.it)('keeps an explicit not-sure count unknown and in Review', () => {
        const result = (0, correction_1.applyCorrections)({
            meal: meal(),
            corrections: [{ item_index: 0, quantity: null, unit: 'adet' }],
        });
        (0, vitest_1.expect)(result.items[0]).toMatchObject({
            quantity: null,
            unit: 'adet',
            grams: 100,
            grams_p10: 65,
            grams_p90: 145,
        });
        (0, vitest_1.expect)(result.items[0].portion_provenance).toContain('correction=quantity=user_confirmed,unit=user_confirmed');
        (0, vitest_1.expect)(result.action).toBe('review');
    });
    (0, vitest_1.it)('keeps a degraded corrected meal in Review', () => {
        const input = meal();
        input.degraded = true;
        const result = (0, correction_1.applyCorrections)({
            meal: input,
            corrections: [{ item_index: 0, quantity: 2, unit: 'adet' }],
        });
        (0, vitest_1.expect)(result.degraded).toBe(true);
        (0, vitest_1.expect)(result.action).toBe('review');
    });
    (0, vitest_1.it)('uses the existing range for a user gram correction', () => {
        const result = (0, correction_1.applyCorrections)({
            meal: meal(),
            corrections: [{ item_index: 0, grams: 120 }],
        });
        (0, vitest_1.expect)(result.items[0]).toMatchObject({
            grams: 120,
            grams_p10: 96,
            grams_p90: 150,
            portion_source: 'explicit_unit',
        });
        (0, vitest_1.expect)(result.items[0].portion_provenance).toContain('correction=grams=user_confirmed');
    });
    (0, vitest_1.it)('rejects a food outside the locale catalogue', () => {
        (0, vitest_1.expect)(() => (0, correction_1.applyCorrections)({
            meal: meal(),
            corrections: [{ item_index: 0, food_id: 'tr.invented_food' }],
        })).toThrowError(new correction_1.CorrectionValidationError("unknown food_id 'tr.invented_food'"));
    });
    (0, vitest_1.it)('does not trust client nutrient or gram values', () => {
        const input = mealWithAbstain();
        input.items[0].nutrients = (0, models_1.makeNutrients)({ kcal: 99999 });
        input.items[0].grams = 99999;
        input.items[2].nutrients = (0, models_1.makeNutrients)({ kcal: 99999 });
        input.items[2].grams = 99999;
        input.items[2].grams_p10 = 99999;
        input.items[2].grams_p90 = 99999;
        input.totals = (0, models_1.makeNutrients)({ kcal: 99999 });
        const result = (0, correction_1.applyCorrections)({ meal: input, corrections: [] });
        (0, vitest_1.expect)(result.items[0].nutrients.kcal).toBe(329);
        (0, vitest_1.expect)(result.items[0].grams).toBe(100);
        (0, vitest_1.expect)(result.items[2].nutrients).toEqual((0, models_1.makeNutrients)());
        (0, vitest_1.expect)(result.items[2].grams).toBe(0);
        (0, vitest_1.expect)(result.totals.kcal).not.toBe(99999);
    });
});
//# sourceMappingURL=pipeline.correction.test.js.map