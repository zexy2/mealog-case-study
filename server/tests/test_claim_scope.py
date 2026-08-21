import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from scripts.check_claim_scope import claim_issue_number, claim_issue_references


def test_pr_template_shape_binds_claim_issue() -> None:
    template = (ROOT / ".github/pull_request_template.md").read_text(encoding="utf-8")
    body = template.replace("**Closes:** #<issue>", "**Closes:** #71")

    assert claim_issue_number(body) == "71"


@pytest.mark.parametrize("body", ["Closes #71", "closes: #71", "Fixes #71"])
def test_plain_keyword_shapes_bind_claim_issue(body: str) -> None:
    assert claim_issue_number(body) == "71"


def test_prose_issue_reference_does_not_bind_claim_issue() -> None:
    assert claim_issue_references("See #123 for context; no claim is declared.") == []
    assert claim_issue_number("See #123 for context; no claim is declared.") is None


def test_multiple_distinct_claims_fail_loudly() -> None:
    with pytest.raises(ValueError, match=r"multiple distinct claim issues: #71, #72"):
        claim_issue_number("Closes #71\nFixes #72")
