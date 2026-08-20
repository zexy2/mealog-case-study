.PHONY: install eval eval-live test lint invariants status check api db clean

install:
	cd server && python -m pip install -e ".[dev]" -q

# Offline: replays recorded vision responses. No API key, no network.
eval:
	python eval/harness.py --configs V0,V1,V2,V3 --out eval/reports/scorecard.md

# Live: calls the real vision provider. Requires GEMINI_API_KEY.
eval-live:
	python eval/harness.py --configs V3 --live --out eval/reports/scorecard-live.md

test:
	cd server && python -m pytest -q

lint:
	cd server && python -m ruff check src tests

invariants:
	python scripts/check_invariants.py

status:
	python scripts/status.py

# What CI runs. Run this before opening a PR (AGENTS.md section 7).
check: lint test invariants
	python scripts/status.py --check
	python eval/harness.py --configs V0,V1,V2,V3 --check-regression

db:
	docker compose up -d db

api:
	cd server && python -m uvicorn mealog.api.main:app --reload

clean:
	rm -rf eval/reports/*.md
