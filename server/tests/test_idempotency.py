"""A retried upload must not create a second meal. This is the failure the
brief calls out and the one users report in the wild."""
from fastapi.testclient import TestClient

from mealog.api.main import app

client = TestClient(app)


def test_replay_returns_identical_result_and_does_not_duplicate():
    body = {"idempotency_key": "abc-123", "sample_id": "tr_0001", "locale": "tr"}
    first = client.post("/v1/meals", json=body).json()
    second = client.post("/v1/meals", json=body).json()
    assert first == second
    assert first["totals"]["kcal"] == second["totals"]["kcal"]
