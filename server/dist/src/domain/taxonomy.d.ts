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
/**
 * Six-bucket coding from the Dietary Assessment Initiative's cuisine
 * distribution-shift work. Reused verbatim so our per-cuisine numbers are
 * comparable to published evaluations instead of being a private taxonomy.
 */
export declare enum CuisineBucket {
    WESTERN = "western",
    MEDITERRANEAN = "mediterranean",
    EAST_ASIAN = "east_asian",
    SOUTH_ASIAN = "south_asian",
    LATIN_AMERICAN = "latin_american",
    OTHER_MIXED = "other_mixed"
}
/**
 * How trustworthy a golden-set label is. Reported alongside every metric:
 * an error against a TIER_3 label is weaker evidence than one against TIER_1.
 */
export declare enum GroundTruthTier {
    /** packaged label, or lab/scale-weighed source (Nutrition5k) */
    TIER_1 = "tier_1",
    /** self-cooked, kitchen scale + per-ingredient computation */
    TIER_2 = "tier_2",
    /** two-rater consensus estimate; disagreement recorded */
    TIER_3 = "tier_3"
}
/**
 * Failure taxonomy. The point is not to have codes, it is to be able to say
 * 'X% of our calorie error comes from E7/E9' and let that pick the next fix.
 */
export declare enum ErrorCode {
    /** grilled -> fried chicken */
    E1_WRONG_IDENTITY_SAME_CATEGORY = "E1",
    /** soup -> stew */
    E2_WRONG_CATEGORY = "E2",
    /** item reported that is not present */
    E3_HALLUCINATED_ITEM = "E3",
    /** item present but not reported */
    E4_MISSED_ITEM = "E4",
    /** pizza -> dough + cheese + sauce */
    E5_OVER_DECOMPOSITION = "E5",
    /** mixed plate collapsed into one item */
    E6_UNDER_DECOMPOSITION = "E6",
    /** mass off by >30% */
    E7_PORTION_ERROR = "E7",
    /** ml treated as g */
    E8_UNIT_DENSITY_ERROR = "E8",
    /** raw/cooked, grilled/fried */
    E9_COOKING_METHOD_ERROR = "E9",
    /** kuru fasulye -> baked beans */
    E10_REGIONAL_MISMATCH = "E10",
    /** canonical record itself is wrong */
    E11_BAD_DB_ENTRY = "E11",
    /** should have asked, silently guessed */
    E12_UNSURFACED_AMBIGUITY = "E12"
}
/**
 * A specific human error code must never be inferred from aggregate eval data.
 * Keep this separate from ErrorCode: there are twelve error codes in the
 * taxonomy, and "unclassified" means that a reviewer still needs to choose one.
 */
export declare const UNCLASSIFIED = "unclassified";
/**
 * These are the only codes that can be derived from fields carried by an eval
 * result. The remaining codes describe causes (rather than observable
 * mismatches) and therefore require a human label.
 */
export declare const AUTO_TAGGABLE_CODES: ReadonlySet<ErrorCode>;
/**
 * Codes whose dominant cost is mass, not identity. Used to split the calorie
 * error budget between "what is it" and "how much of it".
 */
export declare const PORTION_CODES: ReadonlySet<ErrorCode>;
/**
 * Codes that a closed-set resolver should make structurally impossible.
 * If any of these appear after V1, that is a bug in the resolver, not the model.
 */
export declare const CLOSED_SET_VIOLATIONS: ReadonlySet<ErrorCode>;
/** Arguments accepted by {@link tagErrors}. Keyword-only in the Python source. */
export interface TagErrorsArgs {
    truthIds: ReadonlySet<string> | readonly string[];
    predIds: ReadonlySet<string> | readonly string[];
    truthGrams?: ReadonlyMap<string, number> | Readonly<Record<string, number>>;
    predGrams?: ReadonlyMap<string, number> | Readonly<Record<string, number>>;
    asked?: boolean;
    identityApplicable?: boolean;
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
export declare function tagErrors(args: TagErrorsArgs): readonly string[];
