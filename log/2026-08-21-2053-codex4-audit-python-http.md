# Legacy Python HTTP serving path investigation

Agent: `codex4`
Claim: [#175](https://github.com/zexy2/mealog-case-study/issues/175)
Branch: `agent/codex4/audit-python-http`
Base: `bc63df7` (`origin/main`, 2026-08-21)

## Scope and method

This was a read-only audit. Only this log is changed. I inspected
`server/src/mealog/api/main.py`, its direct imports and runtime references,
the Makefile, package scripts, README, Compose runtime, evaluation harness,
fixture/locale references, and Python/Nest tests. No Python core, TypeScript
edge, fixture, golden, baseline, or confidence files were modified.

## 1. Current references to the Python HTTP entrypoint

Executable or import references:

| File | Reference | Meaning |
| --- | --- | --- |
| `server/src/mealog/api/main.py:9,20` | FastAPI import and `app = FastAPI(...)` | Legacy app definition. It imports `obs`, validated `settings`, `VisionInput`, and Python `CONFIGS`/`make_vision`/`run` at lines 13–16, then exposes `/health` and `/v1/meals` at lines 61 and 116. |
| `server/tests/test_idempotency.py:10,12,14,17–38,41–132` | `TestClient`, `import mealog.api.main as api`, `TestClient(api.app)`, subprocess import, and endpoint tests | Active Python HTTP test dependency. The five tests cover startup config failure, multipart validation/replay, JSON fixture replay, and user-scoped idempotency. |
| `Makefile:34–35` | `make api` runs `python -m uvicorn mealog.api.main:app --reload` | Active documented Make target for the old server. |
| `docker-compose.yml:14–36` | Python API service installs `server` and runs `python -m uvicorn mealog.api.main:app`; healthcheck calls port 8000 | Active container/runtime dependency on the old server. |
| `scripts/status.py:75–84` | `probe_photo_ingest()` reads `server/src/mealog/api/main.py` and searches for `UploadFile`/`multipart/form-data` | Hard file-read dependency. Deleting `main.py` without changing this probe makes `python scripts/status.py --check` fail. |

Serving-only packaging references:

| File | Reference | Meaning |
| --- | --- | --- |
| `server/pyproject.toml:6–7` | `fastapi`, `uvicorn` | Runtime dependencies used by the old HTTP entrypoint. |
| `server/pyproject.toml:10–11` | `python-multipart` and its FastAPI comment | Multipart parser needed by the old FastAPI upload path. |
| `server/pyproject.toml:18–24` | `httpx2` and FastAPI TestClient comment | Test dependency used by `test_idempotency.py`. |
| `server/src/mealog/api/__init__.py` | Empty Python API package marker | Package file that becomes removable with `main.py`, after references are migrated. |

Non-executable contract/documentation mentions found by the same search:

- `server/src/app/http-exception.filter.ts:26,47` describes the Nest edge as
  retaining the Python API wire contract and FastAPI's 422 boundary. This is a
  TypeScript comment only and is outside this investigation's change scope.
- `README.md:73,101,112` correctly says Python is research tooling and not the
  delivered API, but its “With more time” bullet still says edge work and
  parity must precede removal of Python serving.
- `docs/decisions.md:273` records the D12 historical constraint that the
  Python serving path is deleted only after parity; it is not an executable
  dependency and is human-gated.
- `docs/walkthrough.md:46,202–203,357` contains stale walkthrough language
  about not yet having the Nest meal endpoint and not showing a Python API
  terminal. It should be refreshed in a documentation cleanup, not silently
  removed as part of this audit.

`server/package.json:11–15` contains only Node `build`, `lint`, `test`, and
`start` scripts. It has no reference to the Python entrypoint. The README's
currently documented run commands use Python for offline checks and Node for
the TypeScript service; it does not document `make api`, although the Make
target remains available.

## 2. Impact on evaluation, parity, fixtures, locales, and commands

The Python offline path does not import `mealog.api.main`:

- `eval/harness.py:23–28` imports the Python vision adapter, taxonomy,
  nutrition, locale loader, and pipeline runner directly. At lines 51, 73,
  79, and 84 it loads locale truth, selects the fixture provider, runs the
  pipeline, and records fixture metadata directly.
- `eval/decompose_real_error.py` directly imports `FixtureVision` and the
  locale loader; `eval/retrieval_eval.py` directly imports locale loading and
  core retrieval/resolve code.
- Python parity/reference tests import locale, domain, and pipeline modules
  directly. The sole Python test import of `mealog.api.main` is
  `server/tests/test_idempotency.py`.
- `server/test/meals.e2e.test.ts` already exercises the NestJS edge over
  Supertest, including JSON and multipart fixture replay, idempotency scoped
  by `X-User-Id`, V0–V3 validation, MIME/10 MiB errors, live-provider
  `sample_id` rejection, and Python-compatible malformed-request errors.

Evidence from current `main` with a throwaway virtualenv:

```text
make check
Ruff: All checks passed!
pytest: 255 passed
check_invariants.py: all architectural invariants hold
status.py --check: STATUS.md matches the repository
eval/harness.py --configs V0,V1,V2,V3 --check-regression: no per-cuisine regression in V3

pytest -q server/tests/test_idempotency.py: 5 passed
```

Therefore the evaluation harness, Python parity tests other than the legacy
HTTP test, fixture replay, and locale loading remain safe in principle. The
repository's current test command does not remain safe if `main.py` is deleted
first, because test collection imports it. The `make api` command,
Compose `api` service, and status probe also fail or become invalid.

## 3. Exact files for a separate cleanup PR

The cleanup must be coordinated across these tracked files:

1. `server/src/mealog/api/main.py` — remove the old FastAPI app after all
   consumers are migrated.
2. `server/src/mealog/api/__init__.py` — remove the now-empty package marker.
3. `server/tests/test_idempotency.py` — remove or replace the Python HTTP
   tests; preserve their behavior through the existing Nest/Supertest e2e
   coverage before deletion.
4. `scripts/status.py` — change the photo-ingest probe to inspect the Node
   edge or another stable delivered-service signal, rather than reading the
   Python source file.
5. `Makefile` — replace or remove the `api` target so it starts the Node
   service and no longer invokes Uvicorn.
6. `docker-compose.yml` — replace/remove the Python API service and its
   port-8000 Uvicorn healthcheck; the delivered runtime is Node.
7. `server/pyproject.toml` — remove `fastapi`, `uvicorn`,
   `python-multipart`, and the FastAPI-only `httpx2` test dependency only
   after the API test and runtime references are gone. Keep `pydantic`,
   `pyyaml`, and `scikit-learn`, which are still used by Python evaluation
   and core tooling.
8. `README.md` and `docs/walkthrough.md` — refresh stale sequencing and
   “endpoint not yet implemented” text. This is documentation cleanup; D12
   itself remains historical and human-gated.

`server/package.json` has no Python reference to remove. It may be updated in
that cleanup only if the replacement Make/Compose command needs a new Node
script; no such change is required for this investigation.

## 4. Conclusion

Physical removal is **not safe now**. The delivered backend has moved to
NestJS, and the offline evaluation/parity/fixture/locale code is independent,
but the old Python app is still a live dependency of `make test` collection,
`make api`, Compose, and `scripts/status.py`. Retire it in a separate cleanup
PR after those consumers are replaced and the Python HTTP-only dependencies
are verified removable. This investigation makes no source changes.

Traps: Do not infer “unused” from `eval/harness.py`; it intentionally bypasses
HTTP and still needs the Python runner, adapters, locale loader, and metrics.
Deleting `main.py` first breaks the status probe and Python test collection,
even though all five current repository gates pass and the Nest edge suite
already contains the corresponding HTTP coverage.
