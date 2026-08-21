"""Repository secret guard regressions."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "check_secrets.py"


def _run_guard(root: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(SCRIPT), "--root", str(root)],
        check=False,
        capture_output=True,
        text=True,
    )


def _track(root: Path, relative: str, content: str) -> None:
    path = root / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    subprocess.run(["git", "-C", str(root), "add", relative], check=True)


def test_synthetic_google_key_fails_the_guard(tmp_path: Path) -> None:
    subprocess.run(["git", "-C", str(tmp_path), "init", "--quiet"], check=True)
    synthetic_key = "AIza" + "A" * 35
    variable_name = "GEMINI" + "_API_KEY"
    _track(tmp_path, "leaked.txt", f"{variable_name}={synthetic_key}\n")

    result = _run_guard(tmp_path)

    assert result.returncode != 0
    assert "Google API key pattern" in result.stdout
    assert synthetic_key not in result.stdout


def test_real_fixture_and_manifest_data_pass_cleanly() -> None:
    assert (ROOT / "eval" / "fixtures" / "n5k_0001.json").is_file()
    assert (ROOT / "eval" / "golden" / "manifest.jsonl").is_file()

    result = _run_guard(ROOT)

    assert result.returncode == 0, result.stdout + result.stderr
