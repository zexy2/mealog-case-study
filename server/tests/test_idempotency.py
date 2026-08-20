"""The HTTP boundary must be safe to retry and explicit about bad requests."""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace

from fastapi.testclient import TestClient

import mealog.api.main as api

client = TestClient(api.app)


def test_startup_refuses_gemini_without_an_api_key():
    environment = os.environ.copy()
    environment["VISION_PROVIDER"] = "gemini"
    environment.pop("GEMINI_API_KEY", None)
    source_root = Path(__file__).resolve().parents[1] / "src"
    existing_pythonpath = environment.get("PYTHONPATH")
    environment["PYTHONPATH"] = os.pathsep.join(
        path for path in (str(source_root), existing_pythonpath) if path
    )

    result = subprocess.run(
        [sys.executable, "-c", "import mealog.api.main"],
        cwd=source_root.parent.parent,
        env=environment,
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode != 0
    assert "GEMINI_API_KEY" in result.stderr
    assert "VISION_PROVIDER=fixture" in result.stderr


def test_unknown_config_returns_422_for_multipart_image():
    api._SEEN.clear()
    response = client.post(
        "/v1/meals",
        data={"idempotency_key": "unknown-config", "config": "V9"},
        files={"image": ("meal.jpg", b"not-a-real-photo", "image/jpeg")},
    )

    assert response.status_code == 422
    assert response.json() == {
        "detail": "unknown config 'V9'; expected one of: V0, V1, V2, V3"
    }


def test_multipart_replay_returns_identical_body_without_rerunning_pipeline(monkeypatch):
    api._SEEN.clear()
    calls = []

    def fake_make_vision(provider, api_key):
        return object()

    def fake_run(vision, input_ref, locale, config, idempotency_key):
        calls.append((vision, input_ref, locale, config.name, idempotency_key))
        return SimpleNamespace(
            model_dump=lambda: {
                "idempotency_key": idempotency_key,
                "config": config.name,
                "locale": locale,
            }
        )

    monkeypatch.setattr(api, "make_vision", fake_make_vision)
    monkeypatch.setattr(api, "run", fake_run)
    image = b"same-image-bytes"
    form = {"idempotency_key": "multipart-replay", "config": "V3"}
    files = {"image": ("meal.jpg", image, "image/jpeg")}

    first = client.post("/v1/meals", data=form, files=files)
    second = client.post("/v1/meals", data=form, files=files)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json() == second.json()
    assert len(calls) == 1
    assert calls[0][1].image_bytes == image
    assert calls[0][1].image_media_type == "image/jpeg"


def test_replay_returns_identical_result_and_does_not_duplicate():
    body = {"idempotency_key": "abc-123", "sample_id": "tr_0001", "locale": "tr"}
    first = client.post("/v1/meals", json=body).json()
    second = client.post("/v1/meals", json=body).json()
    assert first == second
    assert first["totals"]["kcal"] == second["totals"]["kcal"]
