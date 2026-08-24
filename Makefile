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
	cd server && npm test
	cd apps/mobile && npm test

lint:
	cd server && npm run typecheck
	cd apps/mobile && npm run typecheck

invariants:
	python3 scripts/check_invariants.py

status:
	python3 scripts/status.py

# What CI runs. Run this before opening a PR (AGENTS.md section 7).
check: lint test invariants
	python3 scripts/status.py --check


db:
	docker compose up -d db

# Delivered HTTP backend: Node.js/TypeScript NestJS. Python remains evaluation/reference tooling.
api:
	cd server && npm run build && npm start

clean:
	rm -rf eval/reports/*.md
