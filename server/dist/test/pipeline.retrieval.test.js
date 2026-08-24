"use strict";
/**
 * Retrieval port: the behaviours the Python module earned the hard way.
 *
 * The aggregate parity evidence (the 145-variant retrieval scorecard on the
 * 53-food catalogue, reproduced byte-for-byte against the Python
 * implementation) lives in the pull request. These tests pin the individual
 * properties so a later change cannot quietly undo one while the aggregate
 * still looks fine.
 *
 * Fixtures are hand-built rather than loaded from `locale_packs/`, but they
 * use the real LocalePack class so retrieval exercises the same type boundary
 * as the loader. The real normalize.fold implementation is used directly.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_1 = require("../src/pipeline/retrieval/index");
const loader_1 = require("../src/locales/loader");
const models_1 = require("../src/domain/models");
const tfidf_1 = require("../src/pipeline/retrieval/tfidf");
function makeFood(food_id, name, locale) {
    return {
        food_id,
        name,
        per_100g: (0, models_1.makeNutrients)(),
        default_serving_g: 100,
        default_serving_name: '100 g',
        source: 'test',
        locale,
        packaged: false,
        serving_size_g: null,
        serving_size_name: null,
        serving_size_source: null,
        net_weight_g: null,
        net_weight_source: null,
        density_g_per_ml: null,
        density_source: null,
    };
}
function makePack(init) {
    return new loader_1.LocalePack({
        locale: init.locale,
        cuisine_bucket: 'other_mixed',
        nutrition_source: 'test',
        license: loader_1.LicenseTerm.PUBLIC_DOMAIN,
        license_note: null,
        foods: Object.fromEntries(Object.entries(init.foods).map(([food_id, name]) => [food_id, makeFood(food_id, name, init.locale)])),
        aliases: init.aliases,
        negative_aliases: init.negative_aliases,
        text_rules: init.text_rules,
    });
}
const TR_RULES = {
    lowercase: true,
    strip_accents: true,
    char_map: { '\u0130': 'i', I: 'i', '\u0131': 'i' },
};
/** Modelled on `locale_packs/tr`, including its real negative aliases. */
function trPack() {
    return makePack({
        locale: 'tr',
        text_rules: TR_RULES,
        foods: {
            'tr.pilav': 'Pilav',
            'tr.kuru_fasulye': 'Kuru Fasulye',
            'tr.ekmek_beyaz': 'Beyaz Ekmek',
            'tr.mercimek_corbasi': 'Mercimek Çorbası',
        },
        aliases: {
            'tr.pilav': ['pilav', 'pilavi', 'pirinc', 'pirinc pilavi', 'sade pirinc pilavi'],
            'tr.kuru_fasulye': ['kuru fasulye', 'fasulye', 'etli kuru fasulye'],
            'tr.ekmek_beyaz': ['beyaz ekmek', 'ekmek'],
            'tr.mercimek_corbasi': ['mercimek', 'mercimek corbasi'],
        },
        negative_aliases: {
            // 'etli ekmek' is a documented trap for two different foods. Both must
            // be capped, or the query slides from the first to the second.
            'tr.kuru_fasulye': ['baked beans', 'baked bean', 'etli ekmek'],
            'tr.ekmek_beyaz': ['etli ekmek'],
        },
    });
}
/** Minimal English pack for the token-boundary case. */
function enPack() {
    return makePack({
        locale: 'en_US',
        text_rules: { lowercase: true },
        foods: {
            'us.rice_white_cooked': 'White rice, cooked',
            'us.cauliflower_riced': 'Riced cauliflower',
        },
        aliases: {
            'us.rice_white_cooked': ['rice', 'white rice', 'steamed rice'],
            'us.cauliflower_riced': ['riced cauliflower'],
        },
        negative_aliases: {},
    });
}
function retrieval() {
    (0, index_1.clearIndexCache)();
    return (0, index_1.createRetrieval)();
}
// ---------------------------------------------------------------- analyzers
(0, vitest_1.describe)('word analyzer', () => {
    (0, vitest_1.it)('emits unigrams then bigrams, matching sklearn ngram_range=(1, 2)', () => {
        (0, vitest_1.expect)((0, tfidf_1.wordAnalyzer)('riced cauliflower')).toEqual([
            'riced',
            'cauliflower',
            'riced cauliflower',
        ]);
    });
    (0, vitest_1.it)('drops single-character tokens, matching token_pattern \\b\\w\\w+\\b', () => {
        (0, vitest_1.expect)((0, tfidf_1.wordAnalyzer)('a rice')).toEqual(['rice']);
        (0, vitest_1.expect)((0, tfidf_1.wordAnalyzer)('ab')).toEqual(['ab']);
        (0, vitest_1.expect)((0, tfidf_1.wordAnalyzer)('   ')).toEqual([]);
    });
    (0, vitest_1.it)('keeps non-ASCII tokens whole', () => {
        // JavaScript's \b is ASCII-only, so a literal transliteration of the
        // Python pattern would split these. They must survive as single tokens.
        (0, vitest_1.expect)((0, tfidf_1.wordAnalyzer)('çorbası')).toEqual(['çorbası']);
        (0, vitest_1.expect)((0, tfidf_1.wordAnalyzer)('餃子')).toEqual(['餃子']);
    });
});
(0, vitest_1.describe)('char_wb analyzer', () => {
    (0, vitest_1.it)('pads each word and stays inside it', () => {
        (0, vitest_1.expect)((0, tfidf_1.charWbAnalyzer)('rice')).toEqual([
            ' ri', 'ric', 'ice', 'ce ',
            ' ric', 'rice', 'ice ',
            ' rice', 'rice ',
        ]);
    });
    (0, vitest_1.it)('emits a word shorter than n exactly once', () => {
        (0, vitest_1.expect)((0, tfidf_1.charWbAnalyzer)('a')).toEqual([' a ']);
        (0, vitest_1.expect)((0, tfidf_1.charWbAnalyzer)('ab')).toEqual([' ab', 'ab ', ' ab ']);
    });
    (0, vitest_1.it)('never produces an n-gram spanning two words', () => {
        const grams = (0, tfidf_1.charWbAnalyzer)('kuru fasulye');
        (0, vitest_1.expect)(grams.some((g) => g.includes('u f'))).toBe(false);
        (0, vitest_1.expect)(grams.every((g) => g.trim().split(/\s+/).length === 1)).toBe(true);
    });
});
(0, vitest_1.describe)('IDF', () => {
    (0, vitest_1.it)('uses sklearn smooth_idf: ln((1 + n) / (1 + df)) + 1', () => {
        const docs = ['alpha beta', 'alpha gamma', 'alpha delta'];
        const v = new tfidf_1.TfidfVectoriser(docs, (t) => (0, tfidf_1.wordAnalyzer)(t, 1, 1));
        // 'alpha' is in all three documents, 'beta' in one.
        (0, vitest_1.expect)(v.idfOf('alpha')).toBeCloseTo(Math.log(4 / 4) + 1, 15);
        (0, vitest_1.expect)(v.idfOf('beta')).toBeCloseTo(Math.log(4 / 2) + 1, 15);
        (0, vitest_1.expect)(v.maxIdf).toBeCloseTo(Math.log(4 / 2) + 1, 15);
    });
    (0, vitest_1.it)('reports out-of-vocabulary n-grams instead of dropping them silently', () => {
        const v = new tfidf_1.TfidfVectoriser(['alpha beta'], (t) => (0, tfidf_1.wordAnalyzer)(t, 1, 1));
        const q = v.transform('alpha zeta');
        (0, vitest_1.expect)([...q.present.keys()]).toEqual(['alpha']);
        (0, vitest_1.expect)(q.unseen).toBe(1);
    });
});
// --------------------------------------------- earned behaviour 1: unseen IDF
(0, vitest_1.describe)('unseen n-grams are charged at maximum IDF in the denominator', () => {
    (0, vitest_1.it)('scores an entirely foreign dish below MIN_SIGNAL', () => {
        const cands = retrieval().search('pizza margherita', trPack());
        (0, vitest_1.expect)(cands).toEqual([]);
    });
    (0, vitest_1.it)('is what keeps that score low — dropping unseen grams reintroduces the bug', () => {
        const pack = trPack();
        const index = (0, index_1.buildIndex)(pack, (0, index_1.packIdentity)(pack));
        const query = 'pizza margherita';
        // Reproduce both denominators directly, so the regression is pinned to the
        // mechanism rather than to one query's final number.
        let shipped = 0;
        let ifUnseenWereDropped = 0;
        for (const [vec, weight] of [
            [index.word, index_1.W_WORD],
            [index.char, index_1.W_CHAR],
        ]) {
            const q = vec.transform(query);
            const covered = new Array(index.foodIds.length).fill(0);
            for (const [gram, idf] of q.present) {
                for (const d of vec.documentsContaining(gram)) {
                    covered[d] += idf;
                }
            }
            const best = Math.max(...covered);
            shipped += (best / (q.sum + q.unseen * vec.maxIdf)) * weight;
            if (q.sum > 0) {
                ifUnseenWereDropped += (best / q.sum) * weight;
            }
        }
        (0, vitest_1.expect)(shipped).toBeLessThan(index_1.MIN_SIGNAL);
        // This is the sklearn transform() behaviour the Python module had to
        // correct: "pizza margherita" scored 0.55 against a Turkish rice dish.
        (0, vitest_1.expect)(ifUnseenWereDropped).toBeGreaterThan(0.5);
    });
    (0, vitest_1.it)('charges every unseen n-gram, so the score falls as the query gets more foreign', () => {
        const pack = trPack();
        const index = (0, index_1.buildIndex)(pack, (0, index_1.packIdentity)(pack));
        const near = Math.max(...(0, index_1.similarities)(index, 'pilav'));
        const foreign = Math.max(...(0, index_1.similarities)(index, 'pizza margherita'));
        (0, vitest_1.expect)(near).toBeGreaterThan(foreign);
        (0, vitest_1.expect)(foreign).toBeLessThan(index_1.MIN_SIGNAL);
    });
});
// ------------------------------------ earned behaviour 2: negative_alias caps
(0, vitest_1.describe)('negative_alias eliminates every food carrying the matched alias', () => {
    (0, vitest_1.it)('surfaces the documented trap and caps it below the accept threshold', () => {
        const cands = retrieval().search('baked beans', trPack());
        const kuru = cands.find((c) => c.food_id === 'tr.kuru_fasulye');
        (0, vitest_1.expect)(kuru, 'confusable food was not surfaced').toBeDefined();
        (0, vitest_1.expect)(kuru?.score).toBe(index_1.CONFUSION_SCORE);
    });
    (0, vitest_1.it)('caps every food the alias maps to, so the query cannot slide to a second neighbour', () => {
        // 'etli ekmek' is a documented trap for both kuru fasulye and beyaz ekmek.
        // Capping only the first would leave the second free to clear the
        // resolver threshold — the exact failure that follows catalogue growth.
        const cands = retrieval().search('etli ekmek', trPack());
        const capped = cands.filter((c) => c.score === index_1.CONFUSION_SCORE).map((c) => c.food_id);
        (0, vitest_1.expect)(capped.sort()).toEqual(['tr.ekmek_beyaz', 'tr.kuru_fasulye']);
        for (const c of cands) {
            (0, vitest_1.expect)(c.score).toBeLessThanOrEqual(index_1.CONFUSION_SCORE);
        }
    });
    (0, vitest_1.it)('keeps the confusion cap below the resolver accept threshold', () => {
        // resolve.MIN_ACCEPT_SCORE is 0.34 in the Python source. It is asserted
        // as a literal rather than imported so the two thresholds stay
        // independently readable, matching the Python test. When resolve is
        // ported (#123), this becomes a direct cross-module assertion.
        const MIN_ACCEPT_SCORE = 0.34;
        (0, vitest_1.expect)(index_1.CONFUSION_SCORE).toBeLessThan(MIN_ACCEPT_SCORE);
    });
    (0, vitest_1.it)('does not let a generic negative alias override an exact positive hit', () => {
        // An exact surface hit is stronger evidence than a generic confusion note.
        const pack = trPack();
        pack.negative_aliases['tr.pilav'] = ['pilav'];
        const cands = (0, index_1.createRetrieval)().search('pilav', pack);
        (0, vitest_1.expect)(cands[0]?.food_id).toBe('tr.pilav');
        (0, vitest_1.expect)(cands[0]?.score).toBe(1.0);
    });
});
// ------------------------------- earned behaviour 3: token-boundary matching
(0, vitest_1.describe)('sub-phrase matching respects token boundaries', () => {
    (0, vitest_1.it)('does not match a negative alias inside a longer token', () => {
        const pack = enPack();
        pack.negative_aliases['us.rice_white_cooked'] = ['rice'];
        // "rice" occurs inside "riced", but not as a whole token.
        const cands = (0, index_1.createRetrieval)().search('riced cauliflower', pack);
        const white = cands.find((c) => c.food_id === 'us.rice_white_cooked');
        (0, vitest_1.expect)(white?.score).not.toBe(index_1.CONFUSION_SCORE);
        (0, vitest_1.expect)(cands[0]?.food_id).toBe('us.cauliflower_riced');
    });
    (0, vitest_1.it)('does match a negative alias that occupies whole tokens mid-query', () => {
        const cands = retrieval().search('bir tabak baked beans', trPack());
        (0, vitest_1.expect)(cands.find((c) => c.food_id === 'tr.kuru_fasulye')?.score).toBe(index_1.CONFUSION_SCORE);
    });
});
// ------------------------------------------------------------ search contract
(0, vitest_1.describe)('search', () => {
    (0, vitest_1.it)('returns an exact surface hit at 1.0', () => {
        const cands = retrieval().search('kuru fasulye', trPack());
        (0, vitest_1.expect)(cands[0]?.food_id).toBe('tr.kuru_fasulye');
        (0, vitest_1.expect)(cands[0]?.score).toBe(1.0);
    });
    (0, vitest_1.it)('reaches the same canonical food from inflected forms', () => {
        const r = retrieval();
        for (const q of ['pilav', 'pilavi', 'PİLAV', 'pirinc pilavi']) {
            (0, vitest_1.expect)(r.search(q, trPack())[0]?.food_id, q).toBe('tr.pilav');
        }
    });
    (0, vitest_1.it)('returns no candidates for an empty or whitespace-only query', () => {
        const r = retrieval();
        (0, vitest_1.expect)(r.search('', trPack())).toEqual([]);
        (0, vitest_1.expect)(r.search('   ', trPack())).toEqual([]);
    });
    (0, vitest_1.it)('returns scores ordered descending and inside [0, 1]', () => {
        const cands = retrieval().search('mercimek corbasi', trPack());
        (0, vitest_1.expect)(cands.length).toBeGreaterThan(0);
        for (const c of cands) {
            (0, vitest_1.expect)(c.score).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(c.score).toBeLessThanOrEqual(1);
        }
        (0, vitest_1.expect)(cands.map((c) => c.score)).toEqual([...cands.map((c) => c.score)].sort((a, b) => b - a));
    });
    (0, vitest_1.it)('honours k', () => {
        (0, vitest_1.expect)(retrieval().search('pilav', trPack(), 1).length).toBeLessThanOrEqual(1);
    });
    (0, vitest_1.it)('resolves the same surface form differently per pack', () => {
        const r = retrieval();
        (0, vitest_1.expect)(r.search('rice', enPack())[0]?.food_id).toBe('us.rice_white_cooked');
        (0, vitest_1.expect)(r.search('pilav', trPack())[0]?.food_id).toBe('tr.pilav');
    });
    (0, vitest_1.it)('breaks a genuine tie deterministically, by food_id', () => {
        // Giving the cauliflower entry the alias "cauliflower rice" puts the whole
        // token "rice" into its document too, so both foods cover the query
        // completely and both score 1.0. That is real ambiguity, which D6 hands to
        // the resolver's margin rule rather than resolving silently — but the
        // ordering still has to be stable, so it falls to food_id ascending.
        // Verified against the Python implementation on the same fixture.
        const pack = enPack();
        pack.aliases['us.cauliflower_riced'] = ['riced cauliflower', 'cauliflower rice'];
        const cands = (0, index_1.createRetrieval)().search('rice', pack);
        (0, vitest_1.expect)(cands.map((c) => [c.food_id, c.score])).toEqual([
            ['us.cauliflower_riced', 1.0],
            ['us.rice_white_cooked', 1.0],
        ]);
    });
});
// ------------------------------------------------------------- index caching
(0, vitest_1.describe)('index cache', () => {
    (0, vitest_1.it)('is keyed on pack content, so changed data gets a fresh index', () => {
        const a = trPack();
        const b = trPack();
        (0, vitest_1.expect)((0, index_1.packIdentity)(a)).toBe((0, index_1.packIdentity)(b));
        b.foods['tr.injected'] = makeFood('tr.injected', 'Injected', 'tr');
        b.aliases['tr.injected'] = ['injected food'];
        (0, vitest_1.expect)((0, index_1.packIdentity)(b)).not.toBe((0, index_1.packIdentity)(a));
        const r = (0, index_1.createRetrieval)();
        (0, vitest_1.expect)(r.search('injected food', a)).toEqual([]);
        (0, vitest_1.expect)(r.search('injected food', b)[0]?.food_id).toBe('tr.injected');
    });
    (0, vitest_1.it)('does not key on the locale name, which is not an identity', () => {
        const a = trPack();
        const b = trPack();
        b.foods['tr.pilav'] = makeFood('tr.pilav', 'Something else entirely', 'tr');
        (0, vitest_1.expect)(a.locale).toBe(b.locale);
        (0, vitest_1.expect)((0, index_1.packIdentity)(a)).not.toBe((0, index_1.packIdentity)(b));
    });
});
// -------------------------------------------------------------- score rounding
(0, vitest_1.describe)('score rounding matches Python', () => {
    (0, vitest_1.it)('rounds half to even on an exact tie, as Python round() does', () => {
        // A naive port using Math.round(v * 1000) / 1000 returns 0.313 here.
        (0, vitest_1.expect)((0, index_1.roundHalfEven)(0.3125, 3)).toBe(0.312);
        (0, vitest_1.expect)((0, index_1.roundHalfEven)(0.0625, 3)).toBe(0.062);
        (0, vitest_1.expect)((0, index_1.roundHalfEven)(0.5625, 3)).toBe(0.562);
        (0, vitest_1.expect)((0, index_1.roundHalfEven)(0.4375, 3)).toBe(0.438);
    });
    (0, vitest_1.it)('rounds on the true binary value, not the printed decimal', () => {
        // 0.8625 as a double is 0.86250000000000004..., which is above the tie.
        (0, vitest_1.expect)((0, index_1.roundHalfEven)(0.8625, 3)).toBe(0.863);
        // 0.1235 as a double is 0.12349999999999999..., which is below it.
        (0, vitest_1.expect)((0, index_1.roundHalfEven)(0.1235, 3)).toBe(0.123);
    });
    (0, vitest_1.it)('carries correctly', () => {
        (0, vitest_1.expect)((0, index_1.roundHalfEven)(0.9996, 3)).toBe(1);
        (0, vitest_1.expect)((0, index_1.roundHalfEven)(0, 3)).toBe(0);
    });
});
//# sourceMappingURL=pipeline.retrieval.test.js.map