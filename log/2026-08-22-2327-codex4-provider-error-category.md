# Provider error category boundary

- Agent: codex4
- Claim: #205 for issue #203
- Branch: `agent/codex4/provider-error-category`
- Base: `bbcc6c9` (`origin/main`)

## Done

- Added a typed `VisionProviderError` boundary for terminal provider failures.
- Mapped that typed failure to HTTP 503 with `detail`, `category`,
  `retry_attempted`, and `attempts`; ordinary internal errors remain HTTP 500.
- Kept provider events limited to category and retry metadata. No API key,
  provider response body, or request payload is logged or returned.
- Added adapter and HTTP acceptance coverage, including unchanged 413 and 422
  behavior.

## Retry ladder evidence

The existing Gemini ladder is wired into the request path through `VisionPort`.
It allows up to three attempts per rung, a 30-second elapsed-time ceiling,
bounded jittered backoff, and the configured model -> secondary model ->
text-only fallback chain when permitted. Timeout failures are now categorized
as `provider_timeout`; other terminal provider failures are
`provider_unavailable`. The prior defect was that the ladder's terminal error
was collapsed to a generic error before the HTTP filter, so the request became
an opaque 500.

## Verification

- `npm run build`: pass
- `npm run lint`: pass
- `npm test -- --reporter=dot`: 197 tests passed
- `make check` in a fresh throwaway virtualenv: pass (261 Python tests,
  invariants, status, and regression guard)
- `git diff --check`: pass
- Offline V0-V3 scorecard before: SHA-256
  `bfb1703b317b2f7f075898606e3e8de21cbc5f986a9bbcb39d9625b06107a65e`
- Offline V0-V3 scorecard after: SHA-256
  `bfb1703b317b2f7f075898606e3e8de21cbc5f986a9bbcb39d9625b06107a65e`
- `cmp` of the before/after scorecards: identical; fixture replay did not call
  the provider.

## Traps

- Keep the `detail` message key stable for HTTP clients.
- Only `VisionProviderError` is a 503; a genuine internal defect must stay 500.
- Do not expose raw provider diagnostics, API keys, or payloads in events,
  responses, tests, or future logging.
- Do not edit `.github/workflows/`, evaluation semantics, golden data, or the
  portion/confidence/retrieval/gating pipeline.
