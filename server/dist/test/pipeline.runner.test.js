"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = require("node:path");
const vitest_1 = require("vitest");
const vision_fixture_1 = require("../src/adapters/vision.fixture");
const models_1 = require("../src/domain/models");
const loader_1 = require("../src/locales/loader");
const ports_1 = require("../src/pipeline/ports");
const runner_1 = require("../src/pipeline/runner");
const PACK_ROOT = (0, node_path_1.resolve)(__dirname, '../../locale_packs');
function visionStub(items, order = [], degraded = false) {
    return {
        name: 'handwritten-stub',
        calls: [],
        perceive(input) {
            order.push('perception');
            this.calls.push(input);
            return { observations: items, degraded };
        },
    };
}
(0, vitest_1.describe)('pipeline runner', () => {
    (0, vitest_1.it)('runs one item end to end through a handwritten VisionPort stub', async () => {
        const vision = visionStub([
            (0, models_1.makePerceivedItem)({
                surface_form: 'scrambled eggs',
                confidence: 0.95,
            }),
        ]);
        const result = await (0, runner_1.run)(vision, new ports_1.VisionInput({ text: 'meal text' }), 'en_US', runner_1.CONFIGS.V3, 'runner-single');
        (0, vitest_1.expect)(vision.calls).toHaveLength(1);
        (0, vitest_1.expect)(result.items).toHaveLength(1);
        (0, vitest_1.expect)(result.items[0]).toMatchObject({
            food_id: 'us.eggs_scrambled',
            grams: 100,
            nutrients: { kcal: 149 },
        });
        (0, vitest_1.expect)(result.totals.kcal).toBe(149);
        (0, vitest_1.expect)(result.action).toBe('review');
        (0, vitest_1.expect)(result.degraded).toBe(false);
    });
    (0, vitest_1.it)('reconciles repeated unknown-count observations into one catalogue default', async () => {
        const result = await (0, runner_1.run)(visionStub([
            (0, models_1.makePerceivedItem)({ surface_form: 'ayran', confidence: 1 }),
            (0, models_1.makePerceivedItem)({ surface_form: 'ayran', confidence: 1 }),
            (0, models_1.makePerceivedItem)({ surface_form: 'ayran', confidence: 1 }),
            (0, models_1.makePerceivedItem)({ surface_form: 'ayran', confidence: 1 }),
        ]), new ports_1.VisionInput({ text: 'one glass of ayran' }), 'tr', runner_1.CONFIGS.V3, 'runner-duplicate-ayran');
        (0, vitest_1.expect)(result.items).toHaveLength(1);
        (0, vitest_1.expect)(result.items[0]).toMatchObject({
            food_id: 'tr.ayran',
            quantity: null,
            grams: 200,
            grams_p10: 130,
            grams_p90: 290,
            portion_source: 'catalogue_default',
        });
    });
    (0, vitest_1.it)('keeps an unobserved simit count null and unscaled', async () => {
        const result = await (0, runner_1.run)(visionStub([
            (0, models_1.makePerceivedItem)({ surface_form: 'simit', portion_hint: 'several', confidence: 1 }),
        ]), new ports_1.VisionInput({ text: 'two stacked simits' }), 'tr', runner_1.CONFIGS.V3, 'runner-two-simit-unknown-count');
        (0, vitest_1.expect)(result.items[0]).toMatchObject({
            food_id: 'tr.simit',
            quantity: null,
            grams: 100,
            grams_p10: 65,
            grams_p90: 145,
            portion_source: 'catalogue_default',
        });
        (0, vitest_1.expect)(result.items[0]?.portion_provenance).toBe('catalogue.default_serving_g=100');
    });
    (0, vitest_1.it)('sums known counts when duplicate observations carry the same unit', async () => {
        const result = await (0, runner_1.run)(visionStub([
            (0, models_1.makePerceivedItem)({ surface_form: 'simit', portion_hint: '1 adet', confidence: 1 }),
            (0, models_1.makePerceivedItem)({ surface_form: 'simit', portion_hint: '1 adet', confidence: 1 }),
        ]), new ports_1.VisionInput({ text: 'two simits' }), 'tr', runner_1.CONFIGS.V3, 'runner-known-count-reconciliation');
        (0, vitest_1.expect)(result.items).toHaveLength(1);
        (0, vitest_1.expect)(result.items[0]).toMatchObject({
            food_id: 'tr.simit',
            quantity: 2,
            unit: 'adet',
            grams: 200,
        });
    });
    (0, vitest_1.it)('keeps repeated submissions on one deterministic portion branch', async () => {
        const results = await Promise.all([
            (0, runner_1.run)(visionStub([(0, models_1.makePerceivedItem)({ surface_form: 'chicken breast', confidence: 1 })]), new ports_1.VisionInput({ text: 'chicken breast' }), 'en_US', runner_1.CONFIGS.V3, 'runner-repeat-1'),
            (0, runner_1.run)(visionStub([(0, models_1.makePerceivedItem)({ surface_form: 'chicken breast', portion_hint: 'cup', confidence: 1 })]), new ports_1.VisionInput({ text: 'chicken breast' }), 'en_US', runner_1.CONFIGS.V3, 'runner-repeat-2'),
            (0, runner_1.run)(visionStub([(0, models_1.makePerceivedItem)({ surface_form: 'chicken breast', confidence: 1 })]), new ports_1.VisionInput({ text: 'chicken breast' }), 'en_US', runner_1.CONFIGS.V3, 'runner-repeat-3'),
        ]);
        (0, vitest_1.expect)(results.map((result) => ({
            source: result.items[0]?.portion_source,
            p10: result.items[0]?.grams_p10,
            p90: result.items[0]?.grams_p90,
        }))).toEqual([
            { source: 'catalogue_default', p10: 78, p90: 174 },
            { source: 'catalogue_default', p10: 78, p90: 174 },
            { source: 'catalogue_default', p10: 78, p90: 174 },
        ]);
    });
    (0, vitest_1.it)('does not reconcile different foods', async () => {
        const result = await (0, runner_1.run)(visionStub([
            (0, models_1.makePerceivedItem)({ surface_form: 'simit', confidence: 1 }),
            (0, models_1.makePerceivedItem)({ surface_form: 'ayran', confidence: 1 }),
        ]), new ports_1.VisionInput({ text: 'simit and ayran' }), 'tr', runner_1.CONFIGS.V3, 'runner-different-foods');
        (0, vitest_1.expect)(result.items.map((item) => item.food_id)).toEqual(['tr.simit', 'tr.ayran']);
    });
    (0, vitest_1.it)('forces a high-confidence fallback result to review', async () => {
        const result = await (0, runner_1.run)(visionStub([
            (0, models_1.makePerceivedItem)({
                surface_form: 'scrambled eggs',
                confidence: 1,
                portion_hint: 'one serving',
            }),
        ], [], true), new ports_1.VisionInput({ text: 'meal text' }), 'en_US', runner_1.CONFIGS.V3, 'runner-degraded');
        (0, vitest_1.expect)(result.items[0]).toMatchObject({
            food_id: 'us.eggs_scrambled',
            confidence: 1,
        });
        (0, vitest_1.expect)(result).toMatchObject({ degraded: true, action: 'review' });
    });
    (0, vitest_1.it)('keeps a resolver abstention through the end of the meal', async () => {
        const vision = visionStub([
            (0, models_1.makePerceivedItem)({ surface_form: 'scrambled eggs', confidence: 0.95 }),
            (0, models_1.makePerceivedItem)({ surface_form: 'unicorn casserole', confidence: 0.95 }),
        ]);
        const result = await (0, runner_1.run)(vision, new ports_1.VisionInput({ text: 'meal text' }), 'en_US', runner_1.CONFIGS.V3, 'runner-abstain');
        (0, vitest_1.expect)(result.items).toHaveLength(2);
        (0, vitest_1.expect)(result.items[1]).toMatchObject({
            query: 'unicorn casserole',
            food_id: models_1.ABSTAIN,
            grams: 0,
            grams_p10: 0,
            grams_p90: 0,
            nutrients: { kcal: 0, protein_g: 0, carb_g: 0, fat_g: 0 },
        });
        (0, vitest_1.expect)(result.totals.kcal).toBe(149);
        (0, vitest_1.expect)(result.action).toBe('ask');
        (0, vitest_1.expect)(result.question).toContain('unicorn casserole');
    });
    (0, vitest_1.it)('routes an empty vision response to ask without inventing an item', async () => {
        const vision = visionStub([]);
        const result = await (0, runner_1.run)(vision, 'fixture-empty', 'en_US', runner_1.CONFIGS.V3, 'runner-empty');
        (0, vitest_1.expect)(result.items).toEqual([]);
        (0, vitest_1.expect)(result.totals.kcal).toBe(0);
        (0, vitest_1.expect)(result.action).toBe('ask');
        (0, vitest_1.expect)(result.question).toBe('I could not read this meal. What did you eat?');
    });
    (0, vitest_1.it)('executes perception before the grounded stages', async () => {
        const order = [];
        const vision = visionStub([
            (0, models_1.makePerceivedItem)({ surface_form: 'scrambled eggs', confidence: 0.95 }),
        ], order);
        const result = await (0, runner_1.run)(vision, new ports_1.VisionInput({ text: 'meal text' }), 'en_US', runner_1.CONFIGS.V3, 'runner-order');
        (0, vitest_1.expect)(order).toEqual(['perception']);
        (0, vitest_1.expect)(result.items[0]?.food_id).toBe('us.eggs_scrambled');
        (0, vitest_1.expect)(result.action).toBe('review');
    });
    (0, vitest_1.it)('rejects a separate text argument when input is already a VisionInput', async () => {
        const vision = visionStub([]);
        await (0, vitest_1.expect)((0, runner_1.run)(vision, new ports_1.VisionInput({ text: 'meal text' }), 'en_US', runner_1.CONFIGS.V3, 'runner-text', 'duplicate text')).rejects.toThrow('text must be part of VisionInput');
    });
    (0, vitest_1.it)('passes the string fixture compatibility path to VisionPort', async () => {
        const vision = visionStub([]);
        await (0, runner_1.run)(vision, 'fixture-id', 'en_US', runner_1.CONFIGS.V3, 'runner-fixture');
        (0, vitest_1.expect)(vision.calls[0]).toMatchObject({
            sampleId: 'fixture-id',
            text: null,
        });
    });
    (0, vitest_1.it)('asserts the complete grounded stage order explicitly', async () => {
        vitest_1.vi.resetModules();
        const events = [];
        vitest_1.vi.doMock('../src/locales/loader', () => ({
            load: vitest_1.vi.fn(() => {
                events.push('load');
                return {
                    locale: 'test',
                    text_rules: {},
                    foods: {
                        'test.food': {
                            food_id: 'test.food',
                            name: 'Test food',
                            per_100g: (0, models_1.makeNutrients)({ kcal: 100 }),
                        },
                    },
                    aliases: {},
                    negative_aliases: {},
                    units: {},
                };
            }),
        }));
        vitest_1.vi.doMock('../src/pipeline/normalize', () => ({
            fold: vitest_1.vi.fn((text) => text),
            normalize: vitest_1.vi.fn((items) => {
                events.push('normalize');
                return [{ original: items[0], query: 'test food', quantity: null, unit: null }];
            }),
        }));
        vitest_1.vi.doMock('../src/pipeline/retrieval/index', () => ({
            createRetrieval: vitest_1.vi.fn(() => {
                events.push('retrieval_create');
                return {
                    search: vitest_1.vi.fn(() => {
                        events.push('retrieval');
                        return [{ food_id: 'test.food', name: 'Test food', score: 1 }];
                    }),
                };
            }),
        }));
        vitest_1.vi.doMock('../src/pipeline/resolve', () => ({
            resolve: vitest_1.vi.fn((query, candidates) => {
                events.push('resolve');
                return {
                    query,
                    food_id: 'test.food',
                    candidates,
                    grams: 0,
                    grams_p10: 0,
                    grams_p90: 0,
                    confidence: 1,
                    nutrients: (0, models_1.makeNutrients)(),
                    portion_source: 'not_applicable',
                    portion_provenance: 'not_applicable',
                };
            }),
        }));
        vitest_1.vi.doMock('../src/pipeline/portion', () => ({
            estimate: vitest_1.vi.fn(() => {
                events.push('portion');
                return {
                    grams: 100,
                    p10: 65,
                    p90: 145,
                    source: 'catalogue_default',
                    provenance: 'test',
                };
            }),
        }));
        vitest_1.vi.doMock('../src/pipeline/nutrition', () => ({
            scalePer100g: vitest_1.vi.fn(() => {
                events.push('nutrition');
                return (0, models_1.makeNutrients)({ kcal: 100 });
            }),
        }));
        vitest_1.vi.doMock('../src/pipeline/confidence', () => ({
            AUTO_ACCEPT: 0.75,
            route: vitest_1.vi.fn((log) => {
                events.push('confidence');
                log.action = 'auto_accept';
                return log;
            }),
        }));
        try {
            const mockedRunner = await Promise.resolve().then(() => __importStar(require('../src/pipeline/runner')));
            const vision = visionStub([(0, models_1.makePerceivedItem)({ surface_form: 'test food' })], events);
            await mockedRunner.run(vision, new ports_1.VisionInput({ text: 'meal text' }), 'test', mockedRunner.CONFIGS.V3, 'runner-stage-order');
            (0, vitest_1.expect)(events).toEqual([
                'retrieval_create',
                'load',
                'perception',
                'normalize',
                'retrieval',
                'resolve',
                'portion',
                'nutrition',
                'confidence',
            ]);
        }
        finally {
            vitest_1.vi.doUnmock('../src/locales/loader');
            vitest_1.vi.doUnmock('../src/pipeline/normalize');
            vitest_1.vi.doUnmock('../src/pipeline/retrieval/index');
            vitest_1.vi.doUnmock('../src/pipeline/resolve');
            vitest_1.vi.doUnmock('../src/pipeline/portion');
            vitest_1.vi.doUnmock('../src/pipeline/nutrition');
            vitest_1.vi.doUnmock('../src/pipeline/confidence');
            vitest_1.vi.resetModules();
        }
    });
    (0, vitest_1.it)('keeps the loader-backed pack available to the runner tests', () => {
        (0, vitest_1.expect)((0, loader_1.load)('en_US', PACK_ROOT).foods['us.eggs_scrambled']).toBeDefined();
    });
    (0, vitest_1.it)('replays the recorded ayran fallback and routes its uncertainty to review', async () => {
        const result = await (0, runner_1.run)(new vision_fixture_1.FixtureVision(), 'tr_0003', 'tr', runner_1.CONFIGS.V3, 'runner-ayran-portion');
        (0, vitest_1.expect)(result.items[1]).toMatchObject({
            query: 'ayran',
            food_id: 'tr.ayran',
            grams: 200,
            grams_p10: 150,
            grams_p90: 270,
            confidence: 1,
            quantity: 1,
            unit: 'glass',
            count_origin: 'user_text',
            portion_source: 'catalogue_default_scaled',
            portion_provenance: 'fallback=catalogue.default_serving_g=200; quantity=1; unit=unknown',
        });
        (0, vitest_1.expect)(result.action).toBe('review');
    });
    (0, vitest_1.it)('preserves two simits and one ayran through normalize, resolve, and portion', async () => {
        const result = await (0, runner_1.run)(visionStub([
            (0, models_1.makePerceivedItem)({ surface_form: 'simit', portion_hint: 'two pieces', confidence: 1 }),
            (0, models_1.makePerceivedItem)({ surface_form: 'ayran', portion_hint: 'one serving', confidence: 1 }),
        ]), new ports_1.VisionInput({ text: 'two simits and one ayran' }), 'tr', runner_1.CONFIGS.V3, 'runner-multi-instance');
        (0, vitest_1.expect)(result.items).toMatchObject([
            {
                food_id: 'tr.simit',
                quantity: 2,
                unit: 'pieces',
                grams: 200,
                grams_p10: 150,
                grams_p90: 270,
            },
            {
                food_id: 'tr.ayran',
                quantity: 1,
                unit: 'serving',
                grams: 200,
                grams_p10: 150,
                grams_p90: 270,
            },
        ]);
        (0, vitest_1.expect)(result.totals.kcal).toBe(732);
        (0, vitest_1.expect)(result.action).toBe('review');
    });
    (0, vitest_1.it)('keeps an uncountable provider hint unknown and routes it to review', async () => {
        const result = await (0, runner_1.run)(visionStub([
            (0, models_1.makePerceivedItem)({ surface_form: 'simit', portion_hint: 'several', confidence: 1 }),
        ]), new ports_1.VisionInput({ text: 'several simits' }), 'tr', runner_1.CONFIGS.V3, 'runner-unknown-count');
        (0, vitest_1.expect)(result.items[0]).toMatchObject({
            food_id: 'tr.simit',
            quantity: null,
            unit: 'several',
            grams: 100,
            grams_p10: 65,
            grams_p90: 145,
        });
        (0, vitest_1.expect)(result.action).toBe('review');
    });
});
//# sourceMappingURL=pipeline.runner.test.js.map