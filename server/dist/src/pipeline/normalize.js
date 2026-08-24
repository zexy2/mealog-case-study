"use strict";
/**
 * Locale-aware text and unit normalization.
 *
 * This is a pure TypeScript port of `server/src/mealog/pipeline/normalize.py`.
 * Locale behaviour comes from the pack; no market name belongs in this module.
 * The pack type is structural so the loader can arrive in a later Wave 1 PR
 * without making normalization depend on transport or framework code.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.fold = fold;
exports.parsePortion = parsePortion;
exports.normalize = normalize;
const QTY = /((?:[0-9]+(?:[.,][0-9]+)?\s+[0-9]+\s*\/\s*[0-9]+)|(?:[0-9]+\s*\/\s*[0-9]+)|(?:[0-9]+(?:[.,][0-9]+)?)|[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/u;
const TOKEN = /[\p{L}\p{N}_\u00c0-\u024f]+(?:[-'][\p{L}\p{N}_\u00c0-\u024f]+)*/gu;
const VULGAR_FRACTIONS = {
    '¼': 0.25,
    '½': 0.5,
    '¾': 0.75,
    '⅐': 1 / 7,
    '⅑': 1 / 9,
    '⅒': 0.1,
    '⅓': 1 / 3,
    '⅔': 2 / 3,
    '⅕': 0.2,
    '⅖': 0.4,
    '⅗': 0.6,
    '⅘': 0.8,
    '⅙': 1 / 6,
    '⅚': 5 / 6,
    '⅛': 0.125,
    '⅜': 0.375,
    '⅝': 0.625,
    '⅞': 0.875,
};
const WORD_NUMBERS = {
    zero: 0.0,
    one: 1.0,
    two: 2.0,
    three: 3.0,
    four: 4.0,
    five: 5.0,
    six: 6.0,
    seven: 7.0,
    eight: 8.0,
    nine: 9.0,
    ten: 10.0,
    half: 0.5,
    quarter: 0.25,
    bir: 1.0,
    iki: 2.0,
    uc: 3.0,
    dort: 4.0,
    bes: 5.0,
    alti: 6.0,
    yedi: 7.0,
    sekiz: 8.0,
    dokuz: 9.0,
    on: 10.0,
    yarim: 0.5,
    ceyrek: 0.25,
};
const HALF_WORDS = new Set(['a', 'buçuk', 'bucuk', 'and']);
const SKIP_AFTER_QUANTITY = new Set(['a', 'an', 'of', 'and']);
function tokensOf(text) {
    return [...text.matchAll(TOKEN)].map((match) => ({
        value: match[0],
        end: (match.index ?? 0) + match[0].length,
    }));
}
/** Apply the text rules owned by a locale pack in their Python order. */
function fold(text, pack) {
    const rules = pack.text_rules;
    let out = text;
    for (const [source, destination] of Object.entries(rules.char_map ?? {})) {
        out = out.split(source).join(destination);
    }
    if (rules.lowercase ?? true) {
        out = out.toLowerCase();
    }
    if (rules.strip_accents ?? false) {
        out = out.normalize('NFD').replace(/\p{Mn}/gu, '');
    }
    return out.replace(/\s+/gu, ' ').trim();
}
function parseNumeric(raw) {
    const vulgar = VULGAR_FRACTIONS[raw];
    if (vulgar !== undefined) {
        return vulgar;
    }
    const normalized = raw.trim().replaceAll(',', '.');
    const mixed = normalized.split(/\s+/u);
    if (mixed.length === 2 && mixed[1].includes('/')) {
        const [numerator, denominator] = mixed[1].split('/', 2);
        return Number(mixed[0]) + Number(numerator) / Number(denominator);
    }
    const compact = normalized.replace(/\s+/gu, '');
    if (compact.includes('/')) {
        const [numerator, denominator] = compact.split('/', 2);
        return Number(numerator) / Number(denominator);
    }
    return Number(compact);
}
/** Return the first meaningful token after a numeric or word quantity. */
function unitAfter(text, end) {
    for (const token of tokensOf(text.slice(end))) {
        if (!SKIP_AFTER_QUANTITY.has(token.value)) {
            return token.value;
        }
    }
    return null;
}
function wordQuantity(text) {
    const tokens = tokensOf(text);
    for (let index = 0; index < tokens.length; index += 1) {
        const token = tokens[index];
        let value = WORD_NUMBERS[token.value];
        if (value === undefined) {
            continue;
        }
        let end = token.end;
        let nextIndex = index + 1;
        if (value >= 1.0 && nextIndex < tokens.length) {
            let modifier = tokens[nextIndex].value;
            if (HALF_WORDS.has(modifier)) {
                if (modifier === 'and') {
                    nextIndex += 1;
                    if (nextIndex < tokens.length && tokens[nextIndex].value === 'a') {
                        nextIndex += 1;
                    }
                    modifier = tokens[nextIndex]?.value ?? '';
                }
                if (modifier === 'half' || modifier === 'buçuk' || modifier === 'bucuk') {
                    value += 0.5;
                    end = tokens[nextIndex].end;
                }
            }
        }
        return [value, unitAfter(text, end)];
    }
    return null;
}
/** Parse a portion hint into quantity and the first following unit token. */
function parsePortion(hint, pack) {
    if (!hint) {
        return [null, null];
    }
    const text = fold(hint, pack);
    const match = QTY.exec(text);
    if (match !== null) {
        return [parseNumeric(match[1]), unitAfter(text, match.index + match[0].length)];
    }
    const word = wordQuantity(text);
    if (word !== null) {
        return word;
    }
    return [null, text || null];
}
/** Normalize perceived items without changing the original observation. */
function normalize(items, pack, applyRules = true) {
    return items.map((item) => {
        const query = applyRules ? fold(item.surface_form, pack) : item.surface_form.toLowerCase();
        let quantity = item.count;
        let unit = null;
        if (item.count_origin !== 'vision' && applyRules) {
            const [hintQuantity, hintUnit] = parsePortion(item.portion_hint, pack);
            quantity ??= hintQuantity;
            unit = hintUnit;
        }
        return { original: item, query, quantity, unit, count_origin: item.count_origin };
    });
}
//# sourceMappingURL=normalize.js.map