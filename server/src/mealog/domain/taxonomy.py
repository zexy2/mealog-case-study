"""Shared vocabulary for measurement.

These enums are the contract between the pipeline and the eval harness.
Every failure the harness finds is tagged with an ErrorCode; every golden-set
entry carries a CuisineBucket and a GroundTruthTier. Keeping them in the domain
(not in eval/) means production logs and offline evals speak the same language.
"""
from enum import Enum


class CuisineBucket(str, Enum):
    """Six-bucket coding from the Dietary Assessment Initiative's cuisine
    distribution-shift work. Reused verbatim so our per-cuisine numbers are
    comparable to published evaluations instead of being a private taxonomy."""

    WESTERN = "western"
    MEDITERRANEAN = "mediterranean"
    EAST_ASIAN = "east_asian"
    SOUTH_ASIAN = "south_asian"
    LATIN_AMERICAN = "latin_american"
    OTHER_MIXED = "other_mixed"


class GroundTruthTier(str, Enum):
    """How trustworthy a golden-set label is. Reported alongside every metric:
    an error against a TIER_3 label is weaker evidence than one against TIER_1."""

    TIER_1 = "tier_1"  # packaged label, or lab/scale-weighed source (Nutrition5k)
    TIER_2 = "tier_2"  # self-cooked, kitchen scale + per-ingredient computation
    TIER_3 = "tier_3"  # two-rater consensus estimate; disagreement recorded


class ErrorCode(str, Enum):
    """Failure taxonomy. The point is not to have codes, it is to be able to say
    'X% of our calorie error comes from E7/E9' and let that pick the next fix."""

    E1_WRONG_IDENTITY_SAME_CATEGORY = "E1"   # grilled -> fried chicken
    E2_WRONG_CATEGORY = "E2"                 # soup -> stew
    E3_HALLUCINATED_ITEM = "E3"              # item reported that is not present
    E4_MISSED_ITEM = "E4"                    # item present but not reported
    E5_OVER_DECOMPOSITION = "E5"             # pizza -> dough + cheese + sauce
    E6_UNDER_DECOMPOSITION = "E6"            # mixed plate collapsed into one item
    E7_PORTION_ERROR = "E7"                  # mass off by >30%
    E8_UNIT_DENSITY_ERROR = "E8"             # ml treated as g
    E9_COOKING_METHOD_ERROR = "E9"           # raw/cooked, grilled/fried
    E10_REGIONAL_MISMATCH = "E10"            # kuru fasulye -> baked beans
    E11_BAD_DB_ENTRY = "E11"                 # canonical record itself is wrong
    E12_UNSURFACED_AMBIGUITY = "E12"         # should have asked, silently guessed


#: Codes whose dominant cost is mass, not identity. Used to split the calorie
#: error budget between "what is it" and "how much of it".
PORTION_CODES = frozenset({ErrorCode.E7_PORTION_ERROR, ErrorCode.E8_UNIT_DENSITY_ERROR})

#: Codes that a closed-set resolver should make structurally impossible.
#: If any of these appear after V1, that is a bug in the resolver, not the model.
CLOSED_SET_VIOLATIONS = frozenset({ErrorCode.E3_HALLUCINATED_ITEM})
