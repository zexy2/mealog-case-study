"""Observability, deliberately small.

The brief asks for "logging/metrics/traces (simple is fine)", so this is one
structured logger plus a per-stage timer. Every record carries request_id and
the identity of what produced it (config, provider, locale) -- without those a
metric change cannot be attributed to a cause, which is the only reason to log
at all. A full OTel pipeline is listed under "with more time", not built.
"""
from __future__ import annotations

import json
import logging
import sys
import time
import uuid
from contextlib import contextmanager
from contextvars import ContextVar

_request_id: ContextVar[str] = ContextVar("request_id", default="-")


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "msg": record.getMessage(),
            "request_id": _request_id.get(),
        }
        payload.update(getattr(record, "extra_fields", {}) or {})
        return json.dumps(payload, ensure_ascii=False)


def configure(level: str = "INFO") -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers[:] = [handler]
    root.setLevel(level)


log = logging.getLogger("mealog")


def new_request_id() -> str:
    rid = uuid.uuid4().hex[:12]
    _request_id.set(rid)
    return rid


def event(msg: str, **fields) -> None:
    log.info(msg, extra={"extra_fields": fields})


@contextmanager
def stage(name: str, **fields):
    """Times one pipeline stage. Stage timings are the cheapest useful trace:
    they tell you whether a latency regression is retrieval or the provider."""
    t0 = time.perf_counter()
    try:
        yield
    finally:
        event("stage", stage=name, ms=round((time.perf_counter() - t0) * 1000, 2), **fields)
