"""Regression tests for the eval taxonomy and its metric slices."""
import math
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "eval"))

from metrics import Bucket, SampleResult, aggregate, aggregate_by_tier, spread

from mealog.domain.taxonomy import UNCLASSIFIED, ErrorCode, tag_errors


def result(**overrides: object) -> SampleResult:
    values: dict[str, object] = {
        "sample_id": "sample",
        "cuisine": "western",
        "tier": "tier_1",
        "truth_ids": {"food"},
        "pred_ids": {"food"},
        "truth_kcal": 100.0,
        "pred_kcal": 100.0,
        "truth_grams": {"food": 100.0},
        "pred_grams": {"food": 100.0},
    }
    values.update(overrides)
    return SampleResult(**values)  # type: ignore[arg-type]


def test_known_missed_item_is_tagged_e4_without_guessing_a_specific_cause():
    tagged = result(pred_ids=set(), pred_grams={})

    assert ErrorCode.E4_MISSED_ITEM.value in tagged.error_codes
    assert UNCLASSIFIED in tagged.error_codes
    assert ErrorCode.E10_REGIONAL_MISMATCH.value not in tagged.error_codes


def test_auto_tags_mass_error_only_above_thirty_percent():
    assert ErrorCode.E7_PORTION_ERROR.value not in tag_errors(
        truth_ids={"food"}, pred_ids={"food"},
        truth_grams={"food": 100.0}, pred_grams={"food": 130.0},
    )
    assert ErrorCode.E7_PORTION_ERROR.value in tag_errors(
        truth_ids={"food"}, pred_ids={"food"},
        truth_grams={"food": 100.0}, pred_grams={"food": 131.0},
    )


def test_v0_identity_axis_is_not_tagged_as_hallucination():
    tags = tag_errors(
        truth_ids={"food"}, pred_ids={"ungrounded:food"},
        identity_applicable=False,
    )

    assert ErrorCode.E3_HALLUCINATED_ITEM.value not in tags
    assert ErrorCode.E4_MISSED_ITEM.value not in tags


def test_deferred_sample_is_tagged_e12():
    tagged = result(asked=True, pred_ids=set(), pred_grams={})

    assert ErrorCode.E12_UNSURFACED_AMBIGUITY.value in tagged.error_codes


def test_metrics_are_available_by_ground_truth_tier_and_keep_error_counts():
    first = result(sample_id="one", tier="tier_1", pred_ids=set(), pred_grams={})
    second = result(sample_id="two", tier="tier_2", asked=True)

    cuisine_buckets, overall = aggregate([first, second])
    tier_buckets, tier_overall = aggregate_by_tier([first, second])

    assert cuisine_buckets["western"].n == 2
    assert tier_buckets["tier_1"].error_distribution[ErrorCode.E4_MISSED_ITEM.value] == 1
    assert tier_buckets["tier_2"].error_distribution[ErrorCode.E12_UNSURFACED_AMBIGUITY.value] == 1
    assert tier_overall.n == overall.n == 2


def test_zero_error_bucket_is_not_dropped_from_spread():
    buckets = {
        "perfect": Bucket("perfect", apes=[0.0]),
        "imperfect": Bucket("imperfect", apes=[10.0]),
    }

    assert math.isinf(spread(buckets))


@pytest.mark.parametrize("code", [ErrorCode.E1_WRONG_IDENTITY_SAME_CATEGORY,
                                   ErrorCode.E2_WRONG_CATEGORY,
                                   ErrorCode.E9_COOKING_METHOD_ERROR,
                                   ErrorCode.E10_REGIONAL_MISMATCH,
                                   ErrorCode.E11_BAD_DB_ENTRY])
def test_human_judgement_codes_are_not_guessed(code: ErrorCode):
    tags = tag_errors(
        truth_ids={"truth"}, pred_ids={"prediction"},
    )

    assert code.value not in tags
    assert UNCLASSIFIED in tags
