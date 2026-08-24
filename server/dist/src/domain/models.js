"use strict";
/**
 * Pipeline data types. One rule runs through all of them: no stage that talks
 * to a model is allowed to produce a nutrient number. Models produce *references*
 * (a surface form, then a canonical food_id, then grams). Nutrients are computed.
 *
 * Ported 1:1 from `server/src/mealog/domain/models.py`. Field names keep the
 * Python snake_case spelling because these objects cross the API and fixture
 * boundary, where the wire shape is the contract and a rename is a breaking
 * change the parity gate would catch as a diff.
 *
 * This module is framework-agnostic by rule: no NestJS import may appear under
 * `src/domain/`, and `scripts/check_invariants.py` fails the build if one does.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ABSTAIN = void 0;
exports.makeNutrients = makeNutrients;
exports.addNutrients = addNutrients;
exports.roundedNutrients = roundedNutrients;
exports.validateCanonicalFood = validateCanonicalFood;
exports.makePerceivedItem = makePerceivedItem;
exports.makeResolvedItem = makeResolvedItem;
exports.isAbstained = isAbstained;
exports.makeMealLog = makeMealLog;
exports.ABSTAIN = 'ABSTAIN';
/** Pydantic field defaults for `Nutrients`: every macro defaults to 0.0. */
function makeNutrients(init = {}) {
    return {
        kcal: init.kcal ?? 0.0,
        protein_g: init.protein_g ?? 0.0,
        carb_g: init.carb_g ?? 0.0,
        fat_g: init.fat_g ?? 0.0,
    };
}
/** `Nutrients.__add__` */
function addNutrients(a, b) {
    return {
        kcal: a.kcal + b.kcal,
        protein_g: a.protein_g + b.protein_g,
        carb_g: a.carb_g + b.carb_g,
        fat_g: a.fat_g + b.fat_g,
    };
}
/** `Nutrients.rounded` */
function roundedNutrients(n, nd = 1) {
    const factor = 10 ** nd;
    const round = (v) => Math.round(v * factor) / factor;
    return {
        kcal: round(n.kcal),
        protein_g: round(n.protein_g),
        carb_g: round(n.carb_g),
        fat_g: round(n.fat_g),
    };
}
/**
 * `CanonicalFood.validate_food_provenance`.
 *
 * Every supplied mass must arrive with its source. D7 and the packaged-serving
 * work both depend on this: a guess must never be presented with the confidence
 * of a measurement, so a value without provenance is rejected rather than
 * silently trusted.
 *
 * Throws with the Python validator's message on the first violation.
 */
function validateCanonicalFood(food) {
    if ((food.serving_size_g === null) !== (food.serving_size_source === null)) {
        throw new Error('serving_size_g and serving_size_source must be provided together');
    }
    if (food.serving_size_g !== null && food.serving_size_g <= 0) {
        throw new Error('serving_size_g must be positive');
    }
    if (food.serving_size_g !== null && !(food.serving_size_source ?? '').trim()) {
        throw new Error('serving_size_source must not be empty');
    }
    if (food.serving_size_name !== null && food.serving_size_g === null) {
        throw new Error('serving_size_name requires serving_size_g');
    }
    if ((food.net_weight_g === null) !== (food.net_weight_source === null)) {
        throw new Error('net_weight_g and net_weight_source must be provided together');
    }
    if (food.net_weight_g !== null && food.net_weight_g <= 0) {
        throw new Error('net_weight_g must be positive');
    }
    if (food.net_weight_g !== null && !(food.net_weight_source ?? '').trim()) {
        throw new Error('net_weight_source must not be empty');
    }
    if ((food.density_g_per_ml === null) !== (food.density_source === null)) {
        throw new Error('density_g_per_ml and density_source must be provided together');
    }
    if (food.density_g_per_ml !== null && food.density_g_per_ml <= 0) {
        throw new Error('density_g_per_ml must be positive');
    }
    if (food.density_g_per_ml !== null && !(food.density_source ?? '').trim()) {
        throw new Error('density_source must not be empty');
    }
    return food;
}
function makePerceivedItem(init) {
    return {
        surface_form: init.surface_form,
        cooking_method: init.cooking_method ?? null,
        portion_hint: init.portion_hint ?? null,
        count: init.count ?? null,
        count_origin: init.count_origin ?? null,
        capture_medium: init.capture_medium ?? 'real_plate',
        confidence: init.confidence ?? 0.5,
        ungrounded_kcal: init.ungrounded_kcal ?? null,
    };
}
function makeResolvedItem(init) {
    return {
        query: init.query,
        food_id: init.food_id ?? exports.ABSTAIN,
        candidates: init.candidates ?? [],
        quantity: init.quantity ?? null,
        unit: init.unit ?? null,
        count_origin: init.count_origin ?? null,
        capture_medium: init.capture_medium ?? 'real_plate',
        grams: init.grams ?? 0.0,
        grams_p10: init.grams_p10 ?? 0.0,
        grams_p90: init.grams_p90 ?? 0.0,
        confidence: init.confidence ?? 0.0,
        nutrients: init.nutrients ?? makeNutrients(),
        portion_source: init.portion_source ?? 'not_applicable',
        portion_provenance: init.portion_provenance ?? 'not_applicable',
        clarification: init.clarification ?? null,
    };
}
/** `ResolvedItem.abstained` */
function isAbstained(item) {
    return item.food_id === exports.ABSTAIN;
}
function makeMealLog(init) {
    return {
        idempotency_key: init.idempotency_key,
        locale: init.locale,
        cuisine: init.cuisine ?? null,
        items: init.items ?? [],
        totals: init.totals ?? makeNutrients(),
        action: init.action ?? 'review',
        question: init.question ?? null,
        config: init.config ?? 'V3',
        degraded: init.degraded ?? false,
    };
}
//# sourceMappingURL=models.js.map