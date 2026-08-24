"use strict";
/**
 * The domain vocabulary is the contract between the pipeline and the eval
 * harness, and the port epic's parity gate compares harness output field for
 * field. A renamed member or a changed string value would move every historical
 * number silently, so the exact sets are asserted here rather than assumed.
 *
 * Two layers:
 *  1. Literal expectations, which survive the deletion of the Python backend.
 *  2. A parity check read straight out of the Python source, which catches
 *     drift on *either* side while both languages coexist. It skips itself once
 *     `domain/taxonomy.py` is gone (Wave 3), rather than failing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const vitest_1 = require("vitest");
const taxonomy_1 = require("../src/domain/taxonomy");
const models_1 = require("../src/domain/models");
const PYTHON_TAXONOMY = (0, node_path_1.join)(__dirname, '..', 'src', 'mealog', 'domain', 'taxonomy.py');
(0, vitest_1.describe)('CuisineBucket', () => {
    (0, vitest_1.it)('has exactly the six buckets, with the published string values', () => {
        (0, vitest_1.expect)(Object.entries(taxonomy_1.CuisineBucket)).toEqual([
            ['WESTERN', 'western'],
            ['MEDITERRANEAN', 'mediterranean'],
            ['EAST_ASIAN', 'east_asian'],
            ['SOUTH_ASIAN', 'south_asian'],
            ['LATIN_AMERICAN', 'latin_american'],
            ['OTHER_MIXED', 'other_mixed'],
        ]);
    });
    (0, vitest_1.it)('is six buckets and not five or seven', () => {
        (0, vitest_1.expect)(Object.keys(taxonomy_1.CuisineBucket)).toHaveLength(6);
    });
});
(0, vitest_1.describe)('GroundTruthTier', () => {
    (0, vitest_1.it)('has exactly the three tiers', () => {
        (0, vitest_1.expect)(Object.entries(taxonomy_1.GroundTruthTier)).toEqual([
            ['TIER_1', 'tier_1'],
            ['TIER_2', 'tier_2'],
            ['TIER_3', 'tier_3'],
        ]);
    });
});
(0, vitest_1.describe)('ErrorCode', () => {
    (0, vitest_1.it)('has exactly E1 through E12, with the Python member names', () => {
        (0, vitest_1.expect)(Object.entries(taxonomy_1.ErrorCode)).toEqual([
            ['E1_WRONG_IDENTITY_SAME_CATEGORY', 'E1'],
            ['E2_WRONG_CATEGORY', 'E2'],
            ['E3_HALLUCINATED_ITEM', 'E3'],
            ['E4_MISSED_ITEM', 'E4'],
            ['E5_OVER_DECOMPOSITION', 'E5'],
            ['E6_UNDER_DECOMPOSITION', 'E6'],
            ['E7_PORTION_ERROR', 'E7'],
            ['E8_UNIT_DENSITY_ERROR', 'E8'],
            ['E9_COOKING_METHOD_ERROR', 'E9'],
            ['E10_REGIONAL_MISMATCH', 'E10'],
            ['E11_BAD_DB_ENTRY', 'E11'],
            ['E12_UNSURFACED_AMBIGUITY', 'E12'],
        ]);
    });
    (0, vitest_1.it)('numbers the codes E1..E12 with no gaps', () => {
        (0, vitest_1.expect)(Object.values(taxonomy_1.ErrorCode)).toEqual(Array.from({ length: 12 }, (_unused, i) => `E${i + 1}`));
    });
    (0, vitest_1.it)('keeps "unclassified" outside the code set, because it is a review placeholder', () => {
        (0, vitest_1.expect)(taxonomy_1.UNCLASSIFIED).toBe('unclassified');
        (0, vitest_1.expect)(Object.values(taxonomy_1.ErrorCode)).not.toContain(taxonomy_1.UNCLASSIFIED);
    });
});
(0, vitest_1.describe)('code groupings', () => {
    (0, vitest_1.it)('auto-taggable codes are exactly the observable ones', () => {
        (0, vitest_1.expect)([...taxonomy_1.AUTO_TAGGABLE_CODES].sort()).toEqual(['E12', 'E3', 'E4', 'E7']);
    });
    (0, vitest_1.it)('portion codes are mass-dominated failures only', () => {
        (0, vitest_1.expect)([...taxonomy_1.PORTION_CODES].sort()).toEqual(['E7', 'E8']);
    });
    (0, vitest_1.it)('closed-set violations are hallucinations only', () => {
        (0, vitest_1.expect)([...taxonomy_1.CLOSED_SET_VIOLATIONS]).toEqual(['E3']);
    });
});
(0, vitest_1.describe)('ABSTAIN', () => {
    (0, vitest_1.it)('is the literal the resolver returns instead of free text', () => {
        (0, vitest_1.expect)(models_1.ABSTAIN).toBe('ABSTAIN');
    });
});
(0, vitest_1.describe)('tagErrors', () => {
    (0, vitest_1.it)('returns no tags for a perfect grounded sample', () => {
        (0, vitest_1.expect)((0, taxonomy_1.tagErrors)({ truthIds: ['tr.pilav'], predIds: ['tr.pilav'] })).toEqual([]);
    });
    (0, vitest_1.it)('tags an extra prediction as a hallucination, plus the review placeholder', () => {
        (0, vitest_1.expect)((0, taxonomy_1.tagErrors)({ truthIds: ['a'], predIds: ['a', 'b'] })).toEqual(['E3', taxonomy_1.UNCLASSIFIED]);
    });
    (0, vitest_1.it)('tags a missing prediction as a miss', () => {
        (0, vitest_1.expect)((0, taxonomy_1.tagErrors)({ truthIds: ['a', 'b'], predIds: ['a'] })).toEqual(['E4', taxonomy_1.UNCLASSIFIED]);
    });
    (0, vitest_1.it)('does not tag identity for an ungrounded baseline, even with extras', () => {
        (0, vitest_1.expect)((0, taxonomy_1.tagErrors)({
            truthIds: ['a'],
            predIds: ['ungrounded:pilav'],
            identityApplicable: false,
        })).toEqual([]);
    });
    (0, vitest_1.it)('keeps the asked tag when identity is not applicable', () => {
        (0, vitest_1.expect)((0, taxonomy_1.tagErrors)({ truthIds: ['a'], predIds: ['b'], asked: true, identityApplicable: false })).toEqual(['E12']);
    });
    (0, vitest_1.it)('treats mass off by more than 30% as a portion error', () => {
        (0, vitest_1.expect)((0, taxonomy_1.tagErrors)({
            truthIds: ['a'],
            predIds: ['a'],
            truthGrams: { a: 100 },
            predGrams: { a: 131 },
        })).toEqual(['E7', taxonomy_1.UNCLASSIFIED]);
    });
    (0, vitest_1.it)('does not fire at exactly 30%, matching the strict > comparison', () => {
        (0, vitest_1.expect)((0, taxonomy_1.tagErrors)({
            truthIds: ['a'],
            predIds: ['a'],
            truthGrams: { a: 100 },
            predGrams: { a: 130 },
        })).toEqual([]);
    });
    (0, vitest_1.it)('ignores a zero truth mass, which is an identity-only sentinel not a measurement', () => {
        (0, vitest_1.expect)((0, taxonomy_1.tagErrors)({
            truthIds: ['a'],
            predIds: ['a'],
            truthGrams: { a: 0 },
            predGrams: { a: 250 },
        })).toEqual([]);
    });
    (0, vitest_1.it)('deduplicates per sample rather than per item', () => {
        const tags = (0, taxonomy_1.tagErrors)({
            truthIds: ['a', 'b'],
            predIds: ['c', 'd'],
        });
        (0, vitest_1.expect)(tags).toEqual(['E3', 'E4', taxonomy_1.UNCLASSIFIED]);
        (0, vitest_1.expect)(new Set(tags).size).toBe(tags.length);
    });
    (0, vitest_1.it)('accepts Map inputs as well as plain objects', () => {
        (0, vitest_1.expect)((0, taxonomy_1.tagErrors)({
            truthIds: new Set(['a']),
            predIds: new Set(['a']),
            truthGrams: new Map([['a', 100]]),
            predGrams: new Map([['a', 200]]),
        })).toEqual(['E7', taxonomy_1.UNCLASSIFIED]);
    });
});
/**
 * Parity with the Python source while both backends coexist. Reads the enum
 * bodies out of `taxonomy.py` and compares them to the TypeScript enums, so a
 * rename on either side fails rather than drifting until the Wave 3 parity gate.
 */
(0, vitest_1.describe)('parity with the Python domain', () => {
    const pythonSourceExists = (0, node_fs_1.existsSync)(PYTHON_TAXONOMY);
    function membersOf(source, className) {
        const body = new RegExp(`class ${className}\\(str, Enum\\):[\\s\\S]*?\\n\\n\\n`, 'm').exec(`${source}\n\n\n`);
        if (body === null) {
            throw new Error(`could not locate class ${className} in taxonomy.py`);
        }
        const assignment = /^\s{4}([A-Z][A-Z0-9_]*)\s*=\s*"([^"]*)"/gm;
        const out = [];
        let match;
        while ((match = assignment.exec(body[0])) !== null) {
            out.push([match[1], match[2]]);
        }
        return out;
    }
    vitest_1.it.skipIf(!pythonSourceExists)('TypeScript enums match taxonomy.py member for member', () => {
        const source = (0, node_fs_1.readFileSync)(PYTHON_TAXONOMY, 'utf-8');
        (0, vitest_1.expect)(membersOf(source, 'CuisineBucket')).toEqual(Object.entries(taxonomy_1.CuisineBucket));
        (0, vitest_1.expect)(membersOf(source, 'GroundTruthTier')).toEqual(Object.entries(taxonomy_1.GroundTruthTier));
        (0, vitest_1.expect)(membersOf(source, 'ErrorCode')).toEqual(Object.entries(taxonomy_1.ErrorCode));
    });
    vitest_1.it.skipIf(!pythonSourceExists)('UNCLASSIFIED matches the Python constant', () => {
        const source = (0, node_fs_1.readFileSync)(PYTHON_TAXONOMY, 'utf-8');
        const match = /^UNCLASSIFIED = "([^"]+)"/m.exec(source);
        (0, vitest_1.expect)(match?.[1]).toBe(taxonomy_1.UNCLASSIFIED);
    });
});
//# sourceMappingURL=domain.taxonomy.test.js.map