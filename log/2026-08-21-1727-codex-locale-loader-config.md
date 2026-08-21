# Issue #127 — TypeScript locale loader and config

Agent: `codex`
Claim: #136
Issue: #127
Branch: `agent/codex/locale-loader-config`
Base: `origin/main` at `f2bd820`

## Change

- Added framework-free `server/src/locales/loader.ts` with Python-compatible
  `LocalePack`, licence vocabulary, fail-closed commercial enforcement,
  JSONL food/alias/unit loading, and `available()`.
- Cache keys hash pack contents (`pack.yaml`, `text_rules.yaml`, and JSONL
  files), not filesystem mtimes. Commercial enforcement runs after cache lookup
  so a development cache cannot bypass a later commercial refusal.
- Added `server/src/config.ts`; exported settings validate at module import so a
  Gemini deployment without `GEMINI_API_KEY` fails before serving requests.
- Added focused Vitest coverage for every current pack, licence modes, missing
  licences, cache invalidation/reuse, configuration defaults, truthy parsing,
  and missing Gemini credentials.
- Added no dependency. YAML support is limited to the locale-pack vocabulary;
  unsupported shapes fail loudly rather than silently changing legal or locale
  behavior.

## Verification

- Disposable Node clone: `npm ci`, `npm run build`, `npm run lint`, `npm test`;
  all passed, 35 TypeScript tests.
- Fresh Python venv: `make test` 249 passed, `make lint`, architectural
  invariants, `STATUS.md --check`, and V3 regression guard passed.
- Secret guard passed after moving the public snake_case API key getter behind
  private camelCase storage; the guard correctly rejects type annotations that
  resemble sensitive assignments.
- Python scorecard generated from `origin/main` and this branch was 170 lines
  each; `diff -u` reported `scorecard diff: 0 lines`.

Traps: Do not add `yaml` as an undeclared Node dependency or replace the
fail-closed licence path with best-effort parsing. Do not cache only by locale,
mtime, or the first load's commercial mode. The secret guard treats a TypeScript
`gemini_api_key: string | null` annotation as an assignment; keep public
snake_case compatibility through a getter and keep actual storage private.
