## 2026-08-21 01:00 +03 — codex5

Issue:   #19; claim #34
Branch:  `agent/codex5/api-contract`
Commit:  `6e346d2`

Did:     Read the coordinator comment and the post-#24 `api/main.py` contract. Added
         import-time `settings.validated()` fail-fast, explicit config-name 422
         validation, and kept idempotency keyed only by the client key while removing
         the unsupported `user_id` TODO from the API surface. Replaced the old replay
         test coverage with multipart/image-compatible tests, including a pipeline-call
         count assertion.

Result:  Focused tests: 4 passed. Full tests: 28 passed. Ruff, architectural
         invariants, and the offline V3 regression guard passed. `make check` reaches
         the generated status check, which fails because the checked-in `STATUS.md` was
         already stale on `main`; `STATUS.md` was not in the two-file coordinator scope.

Traps:   The issue's old JSON/user-scoped shape is obsolete after #24. Keep the
         multipart `image`/`VisionInput` path and do not invent authentication or a
         Postgres store. The remaining `(user_id, idempotency_key)` prose in README and
         `docs/decisions.md` is owner-gated follow-up; do not edit those files here.
         Also, this checkout has no `python` executable, so use the isolated venv on
         `PATH` when invoking the Makefile.
