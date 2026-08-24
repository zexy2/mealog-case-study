"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const models_1 = require("../src/domain/models");
const normalize_1 = require("../src/pipeline/normalize");
const enPack = {
    text_rules: {
        lowercase: true,
        strip_accents: false,
    },
};
const trPack = {
    text_rules: {
        lowercase: true,
        strip_accents: true,
        char_map: {
            İ: 'i',
            I: 'i',
            ı: 'i',
        },
    },
};
(0, vitest_1.describe)('fold', () => {
    (0, vitest_1.it)('folds Turkish dotted and dotless i through pack data', () => {
        (0, vitest_1.expect)((0, normalize_1.fold)('I İ ı', trPack)).toBe('i i i');
    });
    (0, vitest_1.it)('removes diacritics without a locale branch in the normalizer', () => {
        (0, vitest_1.expect)((0, normalize_1.fold)('ŞİŞ ÇÖĞÜ', trPack)).toBe('sis cogu');
    });
    (0, vitest_1.it)('preserves a mixed Turkish and English string after folding', () => {
        (0, vitest_1.expect)((0, normalize_1.fold)('İKİ cups mercimek', trPack)).toBe('iki cups mercimek');
    });
});
(0, vitest_1.describe)('parsePortion', () => {
    (0, vitest_1.it)('keeps numeric, vulgar, mixed and word quantities', () => {
        (0, vitest_1.expect)((0, normalize_1.parsePortion)('1/2 bowl', enPack)).toEqual([0.5, 'bowl']);
        (0, vitest_1.expect)((0, normalize_1.parsePortion)('½ bowl', enPack)).toEqual([0.5, 'bowl']);
        (0, vitest_1.expect)((0, normalize_1.parsePortion)('1 1/2 cups', enPack)).toEqual([1.5, 'cups']);
        (0, vitest_1.expect)((0, normalize_1.parsePortion)('one and a half cups', enPack)).toEqual([1.5, 'cups']);
    });
    (0, vitest_1.it)('matches the Python Turkish unit token after folding', () => {
        (0, vitest_1.expect)((0, normalize_1.parsePortion)('iki kepçe', trPack)).toEqual([2.0, 'kepce']);
        (0, vitest_1.expect)((0, normalize_1.parsePortion)('kepçe', trPack)).toEqual([null, 'kepce']);
    });
});
(0, vitest_1.describe)('normalize', () => {
    (0, vitest_1.it)('normalizes the query and portion while retaining the observation', () => {
        const item = (0, models_1.makePerceivedItem)({
            surface_form: 'MERCİMEK',
            portion_hint: 'iki kepçe',
        });
        (0, vitest_1.expect)((0, normalize_1.normalize)([item], trPack)).toEqual([
            {
                original: item,
                query: 'mercimek',
                quantity: 2.0,
                unit: 'kepce',
                count_origin: null,
            },
        ]);
    });
    (0, vitest_1.it)('skips portion parsing when rules are disabled', () => {
        const item = (0, models_1.makePerceivedItem)({ surface_form: 'İKİ', portion_hint: 'iki kepçe' });
        (0, vitest_1.expect)((0, normalize_1.normalize)([item], trPack, false)).toEqual([
            {
                original: item,
                query: 'i\u0307ki\u0307',
                quantity: null,
                unit: null,
                count_origin: null,
            },
        ]);
    });
    (0, vitest_1.it)('does not parse numeric vision hints as user quantity evidence', () => {
        const item = (0, models_1.makePerceivedItem)({
            surface_form: 'simit',
            portion_hint: '1 whole',
            count_origin: 'vision',
        });
        (0, vitest_1.expect)((0, normalize_1.normalize)([item], trPack)).toEqual([
            {
                original: item,
                query: 'simit',
                quantity: null,
                unit: null,
                count_origin: 'vision',
            },
        ]);
    });
    (0, vitest_1.it)('uses structured vision count without parsing portion_hint', () => {
        const item = (0, models_1.makePerceivedItem)({
            surface_form: 'simit',
            portion_hint: 'stacked',
            count: 2,
            count_origin: 'vision',
        });
        (0, vitest_1.expect)((0, normalize_1.normalize)([item], trPack)[0]).toMatchObject({
            quantity: 2,
            unit: null,
            count_origin: 'vision',
        });
    });
});
//# sourceMappingURL=pipeline.normalize.test.js.map