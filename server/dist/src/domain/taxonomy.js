"use strict";
/**
 * Shared vocabulary for measurement.
 *
 * These enums are the contract between the pipeline and the eval harness.
 * Every failure the harness finds is tagged with an ErrorCode; every golden-set
 * entry carries a CuisineBucket and a GroundTruthTier. Keeping them in the domain
 * (not in eval/) means production logs and offline evals speak the same language.
 *
 * Ported 1:1 from `server/src/mealog/domain/taxonomy.py`. Member names and string
 * values are identical to the Python source on both sides of the port; the parity
 * gate in the port epic compares harness output field for field, so a value that
 * drifts here silently changes every historical number.
 *
 * This module is framework-agnostic by rule: no NestJS import may appear under
 * `src/domain/`, and `scripts/check_invariants.py` fails the build if one does.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLOSED_SET_VIOLATIONS = exports.PORTION_CODES = exports.AUTO_TAGGABLE_CODES = exports.UNCLASSIFIED = exports.ErrorCode = exports.GroundTruthTier = exports.CuisineBucket = void 0;
exports.tagErrors = tagErrors;
/**
 * Six-bucket coding from the Dietary Assessment Initiative's cuisine
 * distribution-shift work. Reused verbatim so our per-cuisine numbers are
 * comparable to published evaluations instead of being a private taxonomy.
 */
var CuisineBucket;
(function (CuisineBucket) {
    CuisineBucket["WESTERN"] = "western";
    CuisineBucket["MEDITERRANEAN"] = "mediterranean";
    CuisineBucket["EAST_ASIAN"] = "east_asian";
    CuisineBucket["SOUTH_ASIAN"] = "south_asian";
    CuisineBucket["LATIN_AMERICAN"] = "latin_american";
    CuisineBucket["OTHER_MIXED"] = "other_mixed";
})(CuisineBucket || (exports.CuisineBucket = CuisineBucket = {}));
/**
 * How trustworthy a golden-set label is. Reported alongside every metric:
 * an error against a TIER_3 label is weaker evidence than one against TIER_1.
 */
var GroundTruthTier;
(function (GroundTruthTier) {
    /** packaged label, or lab/scale-weighed source (Nutrition5k) */
    GroundTruthTier["TIER_1"] = "tier_1";
    /** self-cooked, kitchen scale + per-ingredient computation */
    GroundTruthTier["TIER_2"] = "tier_2";
    /** two-rater consensus estimate; disagreement recorded */
    GroundTruthTier["TIER_3"] = "tier_3";
})(GroundTruthTier || (exports.GroundTruthTier = GroundTruthTier = {}));
/**
 * Failure taxonomy. The point is not to have codes, it is to be able to say
 * 'X% of our calorie error comes from E7/E9' and let that pick the next fix.
 */
var ErrorCode;
(function (ErrorCode) {
    /** grilled -> fried chicken */
    ErrorCode["E1_WRONG_IDENTITY_SAME_CATEGORY"] = "E1";
    /** soup -> stew */
    ErrorCode["E2_WRONG_CATEGORY"] = "E2";
    /** item reported that is not present */
    ErrorCode["E3_HALLUCINATED_ITEM"] = "E3";
    /** item present but not reported */
    ErrorCode["E4_MISSED_ITEM"] = "E4";
    /** pizza -> dough + cheese + sauce */
    ErrorCode["E5_OVER_DECOMPOSITION"] = "E5";
    /** mixed plate collapsed into one item */
    ErrorCode["E6_UNDER_DECOMPOSITION"] = "E6";
    /** mass off by >30% */
    ErrorCode["E7_PORTION_ERROR"] = "E7";
    /** ml treated as g */
    ErrorCode["E8_UNIT_DENSITY_ERROR"] = "E8";
    /** raw/cooked, grilled/fried */
    ErrorCode["E9_COOKING_METHOD_ERROR"] = "E9";
    /** kuru fasulye -> baked beans */
    ErrorCode["E10_REGIONAL_MISMATCH"] = "E10";
    /** canonical record itself is wrong */
    ErrorCode["E11_BAD_DB_ENTRY"] = "E11";
    /** should have asked, silently guessed */
    ErrorCode["E12_UNSURFACED_AMBIGUITY"] = "E12";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
/**
 * A specific human error code must never be inferred from aggregate eval data.
 * Keep this separate from ErrorCode: there are twelve error codes in the
 * taxonomy, and "unclassified" means that a reviewer still needs to choose one.
 */
exports.UNCLASSIFIED = 'unclassified';
/**
 * These are the only codes that can be derived from fields carried by an eval
 * result. The remaining codes describe causes (rather than observable
 * mismatches) and therefore require a human label.
 */
exports.AUTO_TAGGABLE_CODES = new Set([
    ErrorCode.E3_HALLUCINATED_ITEM,
    ErrorCode.E4_MISSED_ITEM,
    ErrorCode.E7_PORTION_ERROR,
    ErrorCode.E12_UNSURFACED_AMBIGUITY,
]);
/**
 * Codes whose dominant cost is mass, not identity. Used to split the calorie
 * error budget between "what is it" and "how much of it".
 */
exports.PORTION_CODES = new Set([
    ErrorCode.E7_PORTION_ERROR,
    ErrorCode.E8_UNIT_DENSITY_ERROR,
]);
/**
 * Codes that a closed-set resolver should make structurally impossible.
 * If any of these appear after V1, that is a bug in the resolver, not the model.
 */
exports.CLOSED_SET_VIOLATIONS = new Set([
    ErrorCode.E3_HALLUCINATED_ITEM,
]);
function lookup(table, key) {
    if (table === undefined) {
        return undefined;
    }
    if (table instanceof Map) {
        // `instanceof` narrows to Map<any, any>, which would erase the value type.
        return table.get(key);
    }
    // `instanceof Map` does not narrow the ReadonlyMap arm, since ReadonlyMap is
    // a structural interface rather than a class.
    const record = table;
    return Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}
/**
 * Return the observable error tags for one evaluated sample.
 *
 * Identity is deliberately disabled for an ungrounded baseline such as V0:
 * its `ungrounded:<surface>` values are not catalogue IDs, so calling them
 * hallucinations would turn a known baseline limitation into a fake finding.
 * A matched ID whose predicted mass differs by more than 30% is an E7. The
 * more specific cause (for example E8 unit/density error) is not available in
 * this aggregate data, so any non-perfect result also carries `unclassified`
 * as a human-review placeholder rather than a guessed E1/E2/E8/E10 code.
 *
 * Tags are deduplicated per sample. The error distribution therefore counts
 * samples with each observed code, not the number of items in a plate.
 */
function tagErrors(args) {
    const { truthIds, predIds, truthGrams, predGrams } = args;
    const asked = args.asked ?? false;
    const identityApplicable = args.identityApplicable ?? true;
    const tags = [];
    if (asked) {
        tags.push(ErrorCode.E12_UNSURFACED_AMBIGUITY);
    }
    if (!identityApplicable) {
        return tags;
    }
    const truth = new Set(truthIds);
    const pred = new Set(predIds);
    const extras = [...pred].filter((id) => !truth.has(id));
    const missing = [...truth].filter((id) => !pred.has(id));
    const matched = [...truth].filter((id) => pred.has(id));
    if (extras.length > 0) {
        tags.push(ErrorCode.E3_HALLUCINATED_ITEM);
    }
    if (missing.length > 0) {
        tags.push(ErrorCode.E4_MISSED_ITEM);
    }
    let massError = false;
    for (const foodId of matched) {
        const expected = lookup(truthGrams, foodId);
        const actual = lookup(predGrams, foodId);
        if (expected !== undefined &&
            actual !== undefined &&
            expected > 0 &&
            Math.abs(actual - expected) / expected > 0.3) {
            massError = true;
            break;
        }
    }
    if (massError) {
        tags.push(ErrorCode.E7_PORTION_ERROR);
    }
    if (extras.length > 0 || missing.length > 0 || massError) {
        tags.push(exports.UNCLASSIFIED);
    }
    return tags;
}
//# sourceMappingURL=taxonomy.js.map