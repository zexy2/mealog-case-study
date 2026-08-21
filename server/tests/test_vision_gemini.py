from __future__ import annotations

import io
import json
import logging
from pathlib import Path
from typing import Self
from urllib.error import HTTPError, URLError

import pytest

from mealog import obs
from mealog.adapters import vision_gemini
from mealog.adapters.vision_gemini import (
    RUNG_CONFIGURED_MODEL,
    RUNG_FAILURE,
    RUNG_SECONDARY_MODEL,
    RUNG_TEXT_ONLY,
    GeminiVision,
)
from mealog.domain.models import PerceivedItem
from mealog.pipeline.ports import VisionInput


class FakeResponse:
    def __init__(self, payload: dict):
        self._body = json.dumps(payload).encode("utf-8")

    def __enter__(self) -> Self:
        return self

    def __exit__(self, *_args) -> None:
        return None

    def read(self) -> bytes:
        return self._body


class FakeTransport:
    def __init__(self, outcomes: list[dict | BaseException]):
        self.outcomes = outcomes
        self.requests = []

    def __call__(self, request, *, timeout: float):
        self.requests.append((request, timeout))
        outcome = self.outcomes.pop(0)
        if isinstance(outcome, BaseException):
            raise outcome
        return FakeResponse(outcome)


def provider_response(surface_form: str = "rice") -> dict:
    return {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": json.dumps(
                                {
                                    "items": [
                                        {
                                            "surface_form": surface_form,
                                            "cooking_method": None,
                                            "portion_hint": None,
                                            "confidence": 0.9,
                                        }
                                    ]
                                }
                            )
                        }
                    ]
                }
            }
        ]
    }


def provider_error(status: int, headers: dict[str, str] | None = None) -> HTTPError:
    return HTTPError(
        "https://fake.invalid/generateContent",
        status,
        "provider failure",
        headers or {},
        io.BytesIO(b'{"error":"provider failure"}'),
    )


def build_vision(transport: FakeTransport, **kwargs) -> GeminiVision:
    kwargs.setdefault("request_interval", 0)
    return GeminiVision(
        "test-key",
        opener=transport,
        sleep_fn=lambda _delay: None,
        jitter_fn=lambda _cap: 0.0,
        **kwargs,
    )


def test_transient_503_retries_then_records_one_fixture(tmp_path):
    transport = FakeTransport(
        [provider_error(503), provider_error(503), provider_response()]
    )
    vision = build_vision(transport, secondary_model=None)
    input_ref = VisionInput(sample_id="sample-1", text="rice")

    items = vision.perceive(input_ref)
    path = vision.record_fixture(tmp_path, input_ref)

    assert [item.surface_form for item in items] == ["rice"]
    assert len(transport.requests) == 3
    assert vision.last_attempts == 3
    assert vision.degraded is False
    assert vision.rung == RUNG_CONFIGURED_MODEL
    assert list(tmp_path.glob("*.json")) == [path]
    payload = json.loads(path.read_text(encoding="utf-8"))
    assert payload["attempts"] == 3
    assert payload["degraded"] is False
    assert payload["rung"] == RUNG_CONFIGURED_MODEL


def test_retry_after_is_honoured_without_extra_network_call():
    transport = FakeTransport(
        [provider_error(503, {"Retry-After": "4"}), provider_response()]
    )
    delays = []
    vision = GeminiVision(
        "test-key",
        opener=transport,
        secondary_model=None,
        sleep_fn=delays.append,
        jitter_fn=lambda _cap: 0.0,
        max_attempts=2,
        request_interval=0,
    )

    vision.perceive(VisionInput(text="rice"))

    assert delays == [4.0]
    assert len(transport.requests) == 2


@pytest.mark.parametrize("status", [400, 401])
def test_auth_or_request_error_is_not_retried(status):
    transport = FakeTransport([provider_error(status)])
    vision = build_vision(transport)

    with pytest.raises(RuntimeError, match=f"terminal_status={status}"):
        vision.perceive(VisionInput(text="rice"))

    assert len(transport.requests) == 1
    assert vision.degraded is True
    assert vision.rung == RUNG_FAILURE


def test_connection_timeout_is_retried():
    transport = FakeTransport(
        [URLError(TimeoutError("read operation timed out")), provider_response()]
    )
    vision = build_vision(transport, secondary_model=None, max_attempts=2)

    vision.perceive(VisionInput(text="rice"))

    assert len(transport.requests) == 2
    assert vision.last_attempts == 2


def test_exhaustion_emits_one_structured_log_and_sets_failure_metadata(caplog):
    transport = FakeTransport([provider_error(503), provider_error(503), provider_error(503)])
    vision = build_vision(transport, secondary_model=None)
    request_id = obs.new_request_id()
    caplog.set_level(logging.INFO, logger="mealog")

    with pytest.raises(RuntimeError, match=r"Gemini provider exhausted after 3 attempt\(s\)"):
        vision.perceive(VisionInput(text="rice"))

    records = [
        record for record in caplog.records if record.getMessage() == "vision_provider_exhausted"
    ]
    assert len(records) == 1
    fields = records[0].extra_fields
    assert fields["attempts"] == 3
    assert fields["terminal_status"] == 503
    assert isinstance(fields["elapsed_ms"], float)
    assert vision.degraded is True
    assert vision.rung == RUNG_FAILURE
    assert json.loads(obs.JsonFormatter().format(records[0]))["request_id"] == request_id


def test_image_failure_falls_back_to_secondary_text_only_path():
    transport = FakeTransport(
        [provider_error(503), provider_error(503), provider_response("description")]
    )
    vision = build_vision(transport, max_attempts=1)
    input_ref = VisionInput(
        image_bytes=b"fake-image",
        image_media_type="image/jpeg",
        text="rice",
        sample_id="sample-2",
    )

    items = vision.perceive(input_ref)

    assert [item.surface_form for item in items] == ["description"]
    assert len(transport.requests) == 3
    assert vision.degraded is True
    assert vision.rung == RUNG_TEXT_ONLY
    assert vision.last_model == vision.secondary_model
    assert RUNG_SECONDARY_MODEL == "secondary_model"

    first_url = transport.requests[0][0].full_url
    second_url = transport.requests[1][0].full_url
    third_request = transport.requests[2][0]
    assert vision.model in first_url
    assert vision.secondary_model in second_url
    third_payload = json.loads(third_request.data)
    third_parts = third_payload["contents"][0]["parts"]
    assert not any("inlineData" in part for part in third_parts)
    assert {part.get("text") for part in third_parts} >= {"rice"}


def test_model_id_reads_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GEMINI_MODEL", "test-model")

    vision = GeminiVision("key", request_interval=0, secondary_model=None)

    assert vision.model_id == "test-model"


def test_model_id_defaults_to_flash_lite(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("GEMINI_MODEL", raising=False)

    vision = GeminiVision("key", request_interval=0, secondary_model=None)

    assert vision.model_id == "gemini-flash-lite-latest"


def test_request_interval_waits_between_attempts(monkeypatch: pytest.MonkeyPatch) -> None:
    sleeps: list[float] = []
    clock = iter([10.0, 10.0])
    vision = GeminiVision(
        "key",
        request_interval=4,
        secondary_model=None,
        clock_fn=lambda: next(clock),
        sleep_fn=sleeps.append,
    )
    vision._last_request_started = 9.0

    vision._wait_for_request_slot()

    assert sleeps == [3.0]


def test_fixture_payload_stamps_model_and_real_provider() -> None:
    vision = GeminiVision("key", model_id="test-model", request_interval=0, secondary_model=None)
    input_ref = VisionInput(text="simit", sample_id="tr_0003")
    items = [PerceivedItem(surface_form="simit", confidence=0.9)]
    vision.last_input = input_ref
    vision.last_items = items
    vision.last_model = "test-model"
    vision.last_attempts = 1

    payload = vision.fixture_payload(input_ref, items)

    assert payload["provider"] == "gemini"
    assert payload["model_id"] == "test-model"
    assert payload["prompt_version"] == vision_gemini.PROMPT_VERSION
    assert payload["_synthetic"] is False
    assert "model" not in payload


def test_record_fixture_accepts_model_specific_path(tmp_path: Path) -> None:
    vision = GeminiVision("key", model_id="test-model", request_interval=0, secondary_model=None)
    input_ref = VisionInput(text="simit", sample_id="tr_0003")
    vision.last_input = input_ref
    vision.last_items = [PerceivedItem(surface_form="simit")]
    target = tmp_path / "models" / "test-model" / "tr_0003.json"

    path = vision.record_fixture(tmp_path, input_ref, path=target)

    assert path == target
    assert json.loads(path.read_text(encoding="utf-8"))["model_id"] == "test-model"
