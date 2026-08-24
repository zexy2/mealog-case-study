"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const models_1 = require("../src/domain/models");
const loader_1 = require("../src/locales/loader");
const clarification_1 = require("../src/pipeline/clarification");
const pack = (0, loader_1.load)('tr');
(0, vitest_1.describe)('item-scoped clarification metadata', () => {
    (0, vitest_1.it)('asks for a count only when the catalogue has a countable serving', () => {
        const item = (0, models_1.makeResolvedItem)({
            query: 'simit',
            food_id: 'tr.simit',
            confidence: 1,
            quantity: null,
            unit: 'several',
            grams: 100,
            grams_p10: 65,
            grams_p90: 145,
        });
        (0, vitest_1.expect)((0, clarification_1.clarificationFor)(item, pack)).toEqual({
            kind: 'count',
            unit: 'adet',
            options: [1, 2, 3, null],
        });
    });
    (0, vitest_1.it)('asks for portion evidence rather than count on a serving food', () => {
        const item = (0, models_1.makeResolvedItem)({
            query: 'pilav',
            food_id: 'tr.pilav',
            confidence: 1,
            quantity: 1,
            unit: 'porsiyon',
            grams: 180,
            grams_p10: 135,
            grams_p90: 243,
        });
        (0, vitest_1.expect)((0, clarification_1.clarificationFor)(item, pack)).toEqual({ kind: 'portion', unit: null, options: [] });
    });
    (0, vitest_1.it)('does not show count choices when identity is the uncertain dimension', () => {
        const item = (0, models_1.makeResolvedItem)({
            query: 'simit',
            food_id: 'tr.simit',
            candidates: [
                { food_id: 'tr.simit', name: 'Simit', score: 0.5 },
                { food_id: 'tr.ekmek_beyaz', name: 'Ekmek', score: 0.49 },
            ],
            confidence: 0.5,
            quantity: null,
            grams: 100,
            grams_p10: 65,
            grams_p90: 145,
        });
        (0, vitest_1.expect)((0, clarification_1.clarificationFor)(item, pack)).toEqual({ kind: 'identity', unit: null, options: [] });
    });
    (0, vitest_1.it)('keeps an abstention explicit while exposing candidates for manual selection', () => {
        const item = (0, models_1.makeResolvedItem)({
            query: 'unknown',
            food_id: models_1.ABSTAIN,
            candidates: [{ food_id: 'tr.simit', name: 'Simit', score: 0.7 }],
        });
        (0, vitest_1.expect)((0, clarification_1.clarificationFor)(item, pack)).toEqual({ kind: 'identity', unit: null, options: [] });
    });
});
//# sourceMappingURL=pipeline.clarification.test.js.map