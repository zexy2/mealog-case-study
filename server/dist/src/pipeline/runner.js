"use strict";
/**
 * Pipeline orchestration and ablation configurations.
 *
 * This is a framework-free port of `server/src/mealog/pipeline/runner.py`.
 * The only external boundary is VisionPort: adapters are supplied by the
 * caller, while every grounded stage remains a pure pipeline module.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIGS = void 0;
exports.run = run;
const models_1 = require("../domain/models");
const loader_1 = require("../locales/loader");
const normalize_1 = require("./normalize");
const portion_1 = require("./portion");
const index_1 = require("./retrieval/index");
const resolve_1 = require("./resolve");
const confidence_1 = require("./confidence");
const clarification_1 = require("./clarification");
const nutrition_1 = require("./nutrition");
const ports_1 = require("./ports");
exports.CONFIGS = {
    V0: {
        name: 'V0',
        description: 'single-prompt VLM, model reports calories directly',
        grounded: false,
        locale_rules: false,
        gating: false,
    },
    V1: {
        name: 'V1',
        description: '+ closed-set resolution, nutrition computed from catalogue',
        grounded: true,
        locale_rules: false,
        gating: false,
    },
    V2: {
        name: 'V2',
        description: '+ locale text and unit normalization',
        grounded: true,
        locale_rules: true,
        gating: false,
    },
    V3: {
        name: 'V3',
        description: '+ confidence gating and abstention',
        grounded: true,
        locale_rules: true,
        gating: true,
    },
};
const retrieval = (0, index_1.createRetrieval)();
/**
 * Collapse repeated grounded observations without ever collapsing abstentions.
 * ABSTAIN is a sentinel, not a food, so two different unmatched queries must
 * remain visible as two questions. A known count can be added; one unknown
 * contribution makes the merged count unknown.
 */
function reconcileResolved(items) {
    const byFood = new Map();
    const reconciled = [];
    for (const item of items) {
        if (item.food_id === models_1.ABSTAIN) {
            reconciled.push(item);
            continue;
        }
        const existing = byFood.get(item.food_id);
        if (existing === undefined) {
            byFood.set(item.food_id, item);
            reconciled.push(item);
            continue;
        }
        existing.quantity = existing.quantity === null || item.quantity === null
            ? null
            : existing.quantity + item.quantity;
        existing.unit = existing.unit === item.unit ? existing.unit : null;
        existing.count_origin = existing.count_origin === item.count_origin
            ? existing.count_origin
            : existing.count_origin === 'vision' || item.count_origin === 'vision'
                ? 'vision'
                : existing.count_origin ?? item.count_origin;
        if (existing.capture_medium === 'real_plate' && item.capture_medium !== 'real_plate') {
            existing.capture_medium = item.capture_medium;
        }
        existing.confidence = Math.min(existing.confidence, item.confidence);
    }
    return reconciled;
}
function ungroundedLog(perceived, degraded, idempotencyKey, locale, config) {
    const items = perceived.map((item) => (0, models_1.makeResolvedItem)({
        query: item.surface_form,
        food_id: `ungrounded:${item.surface_form}`,
        confidence: item.confidence,
        capture_medium: item.capture_medium,
        nutrients: (0, models_1.makeNutrients)({ kcal: item.ungrounded_kcal || 0.0 }),
    }));
    const totals = items.reduce((acc, item) => (0, models_1.addNutrients)(acc, item.nutrients), (0, models_1.makeNutrients)());
    const mediumFlag = items.find((item) => item.capture_medium !== 'real_plate');
    return (0, models_1.makeMealLog)({
        idempotency_key: idempotencyKey,
        locale,
        config: config.name,
        items,
        totals: (0, models_1.roundedNutrients)(totals),
        action: degraded ? 'review' : mediumFlag === undefined ? 'auto_accept' : 'ask',
        question: mediumFlag === undefined ? null : (0, confidence_1.captureMediumQuestion)(mediumFlag),
        degraded,
    });
}
/**
 * Run one meal through perception, normalization, retrieval, resolution,
 * portion, nutrition, and (for V3) confidence routing.
 *
 * `inputRef: string` preserves the Python runner's fixture compatibility path;
 * live callers should pass a VisionInput. A provided VisionPort may be sync or
 * async, which keeps handwritten test stubs as small as the production port.
 */
async function run(vision, inputRef, locale, config, idempotencyKey, text = null) {
    let input;
    if (typeof inputRef === 'string') {
        input = new ports_1.VisionInput({ sampleId: inputRef, text });
    }
    else {
        if (text !== null) {
            throw new TypeError('text must be part of VisionInput');
        }
        input = inputRef;
    }
    const pack = (0, loader_1.load)(locale);
    const perception = await vision.perceive(input);
    const perceived = perception.observations;
    const degraded = perception.degraded;
    if (!config.grounded) {
        return ungroundedLog(perceived, degraded, idempotencyKey, locale, config);
    }
    const normalized = (0, normalize_1.normalize)(perceived, pack, config.locale_rules);
    const resolved = [];
    for (const item of normalized) {
        const candidates = retrieval.search(item.query, pack);
        const result = (0, resolve_1.resolve)(item.query, candidates, config.gating);
        result.quantity = item.quantity;
        result.unit = item.unit;
        result.count_origin = item.count_origin;
        result.capture_medium = item.original.capture_medium;
        // Keep ABSTAIN as an item. In particular, do not run it through portion or
        // nutrition: a missing catalogue food is not a zero-calorie food.
        resolved.push(result);
    }
    const reconciled = reconcileResolved(resolved);
    for (const result of reconciled) {
        if (result.food_id === models_1.ABSTAIN) {
            continue;
        }
        const food = pack.foods[result.food_id];
        // A missing count is not an implicit one. Keep the item on the catalogue
        // default path even when an uncounted hint happened to name a unit.
        const portion = (0, portion_1.estimate)(food, result.quantity, result.quantity === null ? null : result.unit, pack, undefined, result.count_origin);
        result.grams = portion.grams;
        result.grams_p10 = portion.p10;
        result.grams_p90 = portion.p90;
        result.portion_source = portion.source;
        result.portion_provenance = portion.provenance;
        result.nutrients = (0, models_1.roundedNutrients)((0, nutrition_1.scalePer100g)(food.per_100g, result.grams));
    }
    const totals = reconciled
        .filter((item) => item.food_id !== models_1.ABSTAIN)
        .reduce((acc, item) => (0, models_1.addNutrients)(acc, item.nutrients), (0, models_1.makeNutrients)());
    let log = (0, models_1.makeMealLog)({
        idempotency_key: idempotencyKey,
        locale,
        config: config.name,
        items: reconciled,
        totals: (0, models_1.roundedNutrients)(totals),
        degraded,
    });
    if (degraded) {
        // Provider fallback is never a first-class accepted answer, regardless of
        // identity or portion confidence. The status came from this request's
        // perception envelope, not from mutable adapter state.
        log.action = 'review';
    }
    else if (config.gating) {
        log = (0, confidence_1.route)(log);
    }
    else {
        const mediumFlag = reconciled.find((item) => item.capture_medium !== 'real_plate');
        if (mediumFlag !== undefined) {
            log.action = 'ask';
            log.question = (0, confidence_1.captureMediumQuestion)(mediumFlag);
        }
        else {
            log.action = 'auto_accept';
        }
    }
    return (0, clarification_1.addClarifications)(log, pack);
}
//# sourceMappingURL=runner.js.map