"""Status probes must not self-certify external submission actions."""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

STATUS_PATH = Path(__file__).resolve().parents[2] / "scripts" / "status.py"
SPEC = importlib.util.spec_from_file_location("mealog_status", STATUS_PATH)
assert SPEC is not None and SPEC.loader is not None
status = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = status
SPEC.loader.exec_module(status)


def test_external_artifacts_remain_partial_when_references_exist(tmp_path, monkeypatch):
    monkeypatch.setattr(status, "ROOT", tmp_path)
    (tmp_path / "README.md").write_text(
        "https://www.loom.com/share/0123456789abcdef", encoding="utf-8"
    )
    docs = tmp_path / "docs"
    docs.mkdir()
    (docs / "submission_email_draft.md").write_text("Draft", encoding="utf-8")

    loom = status.probe_loom()
    email = status.probe_email()

    assert loom.state == status.PARTIAL
    assert email.state == status.PARTIAL
    assert "not repository-verifiable" in loom.evidence
    assert "not repository-verifiable" in email.evidence


def test_missing_external_artifacts_are_not_started(tmp_path, monkeypatch):
    monkeypatch.setattr(status, "ROOT", tmp_path)

    assert status.probe_loom().state == status.TODO
    assert status.probe_email().state == status.TODO


def test_render_does_not_claim_external_submission_is_complete():
    rendered = status.render()

    assert "not self-certified as submitted" in rendered
    assert "It does not certify external state" in rendered
    assert "All core technical deliverables are complete and verified" not in rendered


def test_finetune_probe_ignores_dependency_trees(tmp_path, monkeypatch):
    monkeypatch.setattr(status, "ROOT", tmp_path)
    dependency = tmp_path / "apps" / "mobile" / "node_modules"
    dependency.mkdir(parents=True)
    (dependency / "broken-platform-package").symlink_to(
        tmp_path / "does-not-exist", target_is_directory=True
    )

    result = status.probe_finetune()

    assert result.state == status.PARTIAL
    assert "nothing trained" in result.evidence
