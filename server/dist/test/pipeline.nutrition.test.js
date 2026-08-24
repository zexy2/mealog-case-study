"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const models_1 = require("../src/domain/models");
const nutrition_1 = require("../src/pipeline/nutrition");
const food = (overrides = {}) => ({
    food_id: 'test.food',
    name: 'Test food',
    per_100g: (0, models_1.makeNutrients)({ kcal: 250, protein_g: 20, carb_g: 30, fat_g: 10 }),
    default_serving_g: 100,
    default_serving_name: '1 serving',
    source: 'test',
    locale: 'test',
    packaged: false,
    serving_size_g: null,
    serving_size_name: null,
    serving_size_source: null,
    net_weight_g: null,
    net_weight_source: null,
    density_g_per_ml: null,
    density_source: null,
    ...overrides,
});
(0, vitest_1.describe)('nutrition', () => {
    (0, vitest_1.it)('scales one item by gram weight', () => {
        (0, vitest_1.expect)((0, nutrition_1.scalePer100g)(food().per_100g, 40)).toEqual({
            kcal: 100,
            protein_g: 8,
            carb_g: 12,
            fat_g: 4,
        });
    });
    (0, vitest_1.it)('sums several food and gram pairs in order', () => {
        const first = food();
        const second = food({
            food_id: 'test.second',
            per_100g: (0, models_1.makeNutrients)({ kcal: 100, protein_g: 5, carb_g: 10, fat_g: 2 }),
        });
        (0, vitest_1.expect)((0, nutrition_1.total)([
            [first, 40],
            [second, 250],
        ])).toEqual({
            kcal: 350,
            protein_g: 20.5,
            carb_g: 37,
            fat_g: 9,
        });
    });
    (0, vitest_1.it)('returns zero nutrients for a zero-gram item', () => {
        (0, vitest_1.expect)((0, nutrition_1.scalePer100g)(food().per_100g, 0)).toEqual((0, models_1.makeNutrients)());
    });
    (0, vitest_1.it)('uses the model default for a missing macro', () => {
        const partial = food({ per_100g: (0, models_1.makeNutrients)({ kcal: 100 }) });
        (0, vitest_1.expect)((0, nutrition_1.scalePer100g)(partial.per_100g, 50)).toEqual({
            kcal: 50,
            protein_g: 0,
            carb_g: 0,
            fat_g: 0,
        });
    });
    (0, vitest_1.it)('rejects negative mass instead of producing negative nutrients', () => {
        (0, vitest_1.expect)(() => (0, nutrition_1.scalePer100g)(food().per_100g, -1)).toThrow('grams must be non-negative');
    });
});
//# sourceMappingURL=pipeline.nutrition.test.js.map