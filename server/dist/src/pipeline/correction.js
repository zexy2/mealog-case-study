"use strict";
/**
 * Server-side, item-scoped correction.
 *
 * The request contains a MealLog snapshot only as an observation of the
 * previous server response. Nutrients, grams, confidence, and totals from
 * that snapshot are never trusted: every resolved item is re-grounded against
 * the locale pack and recomputed through the existing portion and nutrition
 * functions before routing again.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CorrectionValidationError = void 0;
exports.applyCorrections = applyCorrections;
const models_1 = require("../domain/models");
const loader_1 = require("../locales/loader");
const clarification_1 = require("./clarification");
const confidence_1 = require("./confidence");
const nutrition_1 = require("./nutrition");
const portion_1 = require("./portion");
const runner_1 = require("./runner");
class CorrectionValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CorrectionValidationError';
    }
}
exports.CorrectionValidationError = CorrectionValidationError;
function hasOwn(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
}
function validateNumber(value, field) {
    if (value !== null && value !== undefined && (!Number.isFinite(value) || value < 0)) {
        throw new CorrectionValidationError(`${field} must be null or a non-negative number`);
    }
}
function appendProvenance(base, correction) {
    if (!correction)
        return base;
    const fields = [];
    if (hasOwn(correction, 'food_id'))
        fields.push('food_id=user_confirmed');
    if (hasOwn(correction, 'quantity'))
        fields.push('quantity=user_confirmed');
    if (hasOwn(correction, 'unit'))
        fields.push('unit=user_confirmed');
    if (hasOwn(correction, 'grams'))
        fields.push('grams=user_confirmed');
    return fields.length > 0 ? `${base}; correction=${fields.join(',')}` : base;
}
function validateBase(meal) {
    if (!meal || typeof meal.locale !== 'string' || typeof meal.config !== 'string' || !Array.isArray(meal.items)) {
        throw new CorrectionValidationError('meal must contain locale, config, and items');
    }
}
function validateCandidateIds(meal, foods) {
    for (const item of meal.items) {
        if (item.food_id !== models_1.ABSTAIN && !foods[item.food_id]) {
            throw new CorrectionValidationError(`unknown food_id '${item.food_id}'`);
        }
        for (const candidate of item.candidates) {
            if (!foods[candidate.food_id]) {
                throw new CorrectionValidationError(`unknown candidate food_id '${candidate.food_id}'`);
            }
        }
    }
}
function validateCorrections(meal, corrections) {
    const byIndex = new Map();
    for (const correction of corrections) {
        if (!Number.isInteger(correction.item_index) || correction.item_index < 0 || correction.item_index >= meal.items.length) {
            throw new CorrectionValidationError(`invalid item_index '${correction.item_index}'`);
        }
        if (byIndex.has(correction.item_index)) {
            throw new CorrectionValidationError(`duplicate correction for item ${correction.item_index}`);
        }
        if (correction.food_id === models_1.ABSTAIN) {
            throw new CorrectionValidationError('food_id must be a catalogue food, not ABSTAIN');
        }
        validateNumber(correction.quantity, 'quantity');
        if (correction.unit !== undefined && correction.unit !== null && typeof correction.unit !== 'string') {
            throw new CorrectionValidationError('unit must be null or a string');
        }
        validateNumber(correction.grams, 'grams');
        byIndex.set(correction.item_index, correction);
    }
    return byIndex;
}
function applyCorrections(request) {
    validateBase(request.meal);
    const config = runner_1.CONFIGS[request.meal.config];
    if (!config)
        throw new CorrectionValidationError(`unknown config '${request.meal.config}'`);
    const pack = (0, loader_1.load)(request.meal.locale);
    validateCandidateIds(request.meal, pack.foods);
    const corrections = validateCorrections(request.meal, request.corrections);
    const items = request.meal.items.map((original, index) => {
        const correction = corrections.get(index);
        const foodId = correction?.food_id ?? original.food_id;
        if (foodId === models_1.ABSTAIN) {
            return (0, models_1.makeResolvedItem)({
                ...original,
                food_id: models_1.ABSTAIN,
                grams: 0,
                grams_p10: 0,
                grams_p90: 0,
                nutrients: (0, models_1.makeNutrients)(),
                portion_source: 'not_applicable',
                portion_provenance: 'not_applicable',
                clarification: null,
            });
        }
        const food = pack.foods[foodId];
        if (!food)
            throw new CorrectionValidationError(`unknown food_id '${foodId}'`);
        const quantity = correction && hasOwn(correction, 'quantity')
            ? correction.quantity ?? null
            : original.quantity;
        const unit = correction && hasOwn(correction, 'unit')
            ? correction.unit ?? null
            : original.unit;
        const countOrigin = correction && (hasOwn(correction, 'quantity') || hasOwn(correction, 'unit') || hasOwn(correction, 'grams')) ? 'user_text' : original.count_origin;
        validateNumber(quantity, 'quantity');
        const baseline = (0, portion_1.estimate)(food, quantity, unit, pack, undefined, countOrigin);
        if (correction?.grams !== undefined && (correction.grams < baseline.p10 || correction.grams > baseline.p90)) {
            throw new CorrectionValidationError(`grams must stay within the existing uncertainty range ${baseline.p10}-${baseline.p90}`);
        }
        const portion = (0, portion_1.estimate)(food, quantity, unit, pack, correction?.grams, countOrigin);
        const candidate = original.candidates.find((entry) => entry.food_id === foodId);
        const confidence = correction?.food_id !== undefined ? candidate?.score ?? 1.0 : original.confidence;
        const nutrients = (0, models_1.roundedNutrients)((0, nutrition_1.scalePer100g)(food.per_100g, portion.grams));
        return (0, models_1.makeResolvedItem)({
            ...original,
            food_id: foodId,
            confidence,
            quantity,
            unit,
            count_origin: countOrigin,
            grams: portion.grams,
            grams_p10: portion.p10,
            grams_p90: portion.p90,
            nutrients,
            portion_source: portion.source,
            portion_provenance: appendProvenance(portion.provenance, correction),
            clarification: null,
        });
    });
    const totals = (0, models_1.roundedNutrients)(items
        .filter((item) => item.food_id !== models_1.ABSTAIN)
        .reduce((acc, item) => (0, models_1.addNutrients)(acc, item.nutrients), (0, models_1.makeNutrients)()));
    let corrected = (0, models_1.makeMealLog)({
        ...request.meal,
        items,
        totals,
        question: null,
    });
    corrected = (0, confidence_1.route)(corrected);
    return (0, clarification_1.addClarifications)(corrected, pack);
}
//# sourceMappingURL=correction.js.map