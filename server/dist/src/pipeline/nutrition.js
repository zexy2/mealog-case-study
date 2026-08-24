"use strict";
/**
 * Deterministic nutrition computation.
 *
 * This is the only stage allowed to produce nutrient numbers. It is a pure,
 * framework-free port of `server/src/mealog/pipeline/nutrition.py`: model and
 * adapter code can provide references, but calories and macros come only from
 * the canonical catalogue.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.scalePer100g = scalePer100g;
exports.total = total;
const models_1 = require("../domain/models");
/** Scale a catalogue's per-100g nutrients by a non-negative mass. */
function scalePer100g(per_100g, grams) {
    if (grams < 0) {
        throw new Error('grams must be non-negative');
    }
    const factor = grams / 100.0;
    return (0, models_1.makeNutrients)({
        kcal: per_100g.kcal * factor,
        protein_g: per_100g.protein_g * factor,
        carb_g: per_100g.carb_g * factor,
        fat_g: per_100g.fat_g * factor,
    });
}
/** Sum nutrients over `(food, grams)` pairs in input order. */
function total(pairs) {
    let acc = (0, models_1.makeNutrients)();
    for (const [food, grams] of pairs) {
        acc = (0, models_1.addNutrients)(acc, scalePer100g(food.per_100g, grams));
    }
    return acc;
}
//# sourceMappingURL=nutrition.js.map