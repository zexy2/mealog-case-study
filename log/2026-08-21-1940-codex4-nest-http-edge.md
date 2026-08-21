# NestJS HTTP edge

Agent: `codex4`
Issue: #167
Branch: `agent/codex4/nest-http-edge`
Base: `f465655` (`origin/main`, after the adapter, golden-set and mobile merges)

## Change

- Added the NestJS `POST /v1/meals` edge using the existing runner, `VisionPort`,
  fixture/Gemini adapters and `Settings`; domain, pipeline and adapters remain
  framework-free.
- Added JSON and multipart field parsing, the Python-compatible `422`/`415`/`413`
  responses, the 10 MiB Multer limit, and the adapter MIME allow-list.
- Added user-scoped `(X-User-Id, idempotency_key)` replay, defaulting to
  `demo-user`, plus fixture-only `sample_id` enforcement for live providers.
- Updated `/health` to expose the configured vision provider and added a
  compiled-runtime locale-root walk so `dist/` can find the repository packs.
- Added Nest/Supertest coverage for success, replay, user isolation, V0–V3,
  malformed input, MIME/size limits and live-provider sample-ID rejection.

## Verification

- `npm ci` in the repository's server workspace; no dependency or lockfile change.
- `npm run build`, `npm run lint`, `npm test`: **160 TypeScript tests passed**.
- Fresh throwaway venv `/tmp/mealog-codex4-http-venv`: `make check` passed —
  Ruff, **249 Python tests**, invariants, STATUS check and V3 regression guard.
- V0–V3 scorecard against current main and this branch: SHA-256
  `f0441785eb4858f95a9db84ecef94a5ea4e8a43f1427d451da0cebe01a7fdf0e` on both;
  `diff -u` produced zero lines. The 80-sample scorecard remains unchanged:
  V0 100%/100%/0.00, V1 8%/12.7%/0.35, V2 8%/12.7%/0.35, V3 6%/12.7%/0.32
  for coverage/MAPE/Item F1.
- A compiled `dist` runner smoke test reached `tr` and returned a V3 meal log;
  this verified the loader path that source-only tests do not exercise.

## Traps

Nest's Vitest/esbuild path does not reliably emit constructor metadata, so edge
providers need explicit `@Inject` decorators even though `tsc` emits metadata.
Also, `FileInterceptor` turns an oversized upload into a Nest HTTP exception;
map that response as well as a raw Multer `LIMIT_FILE_SIZE` code or the wire
contract becomes Nest's default 413 body instead of Python's `detail` body.
