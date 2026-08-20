import io
import json
from pathlib import Path
from urllib.error import HTTPError

import pytest

from mealog.adapters import vision_gemini
from mealog.adapters.vision_gemini import GeminiVision
from mealog.domain.models import PerceivedItem
from mealog.pipeline.ports import VisionInput


class _Response:
    def __init__(self, payload: dict):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False

    def read(self):
        return json.dumps(self.payload).encode("utf-8")


def _http_429() -> HTTPError:
    return HTTPError(
        "https://example.test/generateContent",
        429,
        "quota",
        {},
        io.BytesIO(b'{"error":"quota"}'),
    )


def test_model_id_reads_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GEMINI_MODEL", "test-model")

    vision = GeminiVision("key", request_interval=0)

    assert vision.model_id == "test-model"


def test_model_id_defaults_to_flash_lite(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("GEMINI_MODEL", raising=False)

    vision = GeminiVision("key", request_interval=0)

    assert vision.model_id == "gemini-flash-lite-latest"


def test_429_retries_with_backoff(monkeypatch: pytest.MonkeyPatch) -> None:
    responses = [_http_429(), _Response({"ok": True})]
    sleeps: list[float] = []

    def opener(request, timeout):
        response = responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response

    monkeypatch.setattr(vision_gemini.time, "sleep", sleeps.append)
    vision = GeminiVision(
        "key",
        opener=opener,
        request_interval=0,
        retry_backoff_base=0,
    )

    assert vision._request([]) == {"ok": True}
    assert vision.request_count == 2
    assert sleeps == [0]


def test_request_interval_waits_between_attempts(monkeypatch: pytest.MonkeyPatch) -> None:
    sleeps: list[float] = []
    clock = iter([10.0, 10.0])
    vision = GeminiVision("key", request_interval=4)
    vision._last_request_started = 9.0
    monkeypatch.setattr(vision_gemini.time, "monotonic", lambda: next(clock))
    monkeypatch.setattr(vision_gemini.time, "sleep", sleeps.append)

    vision._wait_for_request_slot()

    assert sleeps == [3.0]


def test_fixture_payload_stamps_model_and_real_provider() -> None:
    vision = GeminiVision("key", model_id="test-model", request_interval=0)
    input_ref = VisionInput(text="simit", sample_id="tr_0003")
    items = [PerceivedItem(surface_form="simit", confidence=0.9)]

    payload = vision.fixture_payload(input_ref, items)

    assert payload["provider"] == "gemini"
    assert payload["model_id"] == "test-model"
    assert payload["prompt_version"] == vision_gemini.PROMPT_VERSION
    assert payload["_synthetic"] is False
    assert "model" not in payload


def test_record_fixture_accepts_model_specific_path(tmp_path: Path) -> None:
    vision = GeminiVision("key", model_id="test-model", request_interval=0)
    input_ref = VisionInput(text="simit", sample_id="tr_0003")
    vision.last_input = input_ref
    vision.last_items = [PerceivedItem(surface_form="simit")]
    target = tmp_path / "models" / "test-model" / "tr_0003.json"

    path = vision.record_fixture(tmp_path, input_ref, path=target)

    assert path == target
    assert json.loads(path.read_text(encoding="utf-8"))["model_id"] == "test-model"
