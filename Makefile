PYTHON ?= $(shell if [ -f $(CURDIR)/server/.venv/bin/python ]; then echo "$(CURDIR)/server/.venv/bin/python"; elif which python3 >/dev/null 2>&1; then echo "python3"; else echo "python"; fi)

.PHONY: install eval eval-live test lint invariants status check api db clean

install:
	cd server && $(PYTHON) -m pip install -e ".[dev]" -q

# Offline: replays recorded vision responses. No API key, no network.
eval:
	$(PYTHON) eval/harness.py --configs V0,V1,V2,V3 --out eval/reports/scorecard.md

# Live: calls the real vision provider. Requires GEMINI_API_KEY.
eval-live:
	$(PYTHON) eval/harness.py --configs V3 --live --out eval/reports/scorecard-live.md

test:
	cd server && $(PYTHON) -m pytest -q

lint:
	cd server && $(PYTHON) -m ruff check src tests

invariants:
	$(PYTHON) scripts/check_invariants.py

status:
	$(PYTHON) scripts/status.py

# What CI runs. Run this before opening a PR (AGENTS.md section 7).
check: lint test invariants
	$(PYTHON) scripts/status.py --check
	$(PYTHON) eval/harness.py --configs V0,V1,V2,V3 --check-regression

db:
	docker compose up -d db

# Delivered HTTP backend: Node.js/TypeScript NestJS. Python remains evaluation/reference tooling.
api:
	cd server && npm run build && npm start

clean:
	rm -rf eval/reports/*.md
