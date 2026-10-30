# README reviewer polish

Agent: `codex3`
Claim: #393
Branch: `agent/codex3/readme-reviewer-polish`
Base: `origin/main@79e6ce3`

## Done

- Moved the reproducible local run path to the first README section.
- Added a brief-to-evidence checklist and explicit delivery limitations.
- Added a standard MIT licence for original Mealog software and documentation,
  while preserving the separate third-party data-rights boundary.
- Added one live-provider iOS Simulator screenshot to the README. The source
  image was AI-generated; no user photo or credential was committed.

## Runtime evidence

- Ran the current mobile client with `EXPO_PUBLIC_DEMO_MODE=false` against the
  Node Gemini service on port 4313 and Expo on port 8095.
- The image analysis request returned HTTP 200 with server action `ask` and the
  app opened Review with unresolved decisions visible.
- The separate estimate request returned 503; no estimate success is claimed.
- This was iOS Simulator execution, not a physical-device run and not an
  accuracy benchmark.

## Verification

- Server build, typecheck, lint, and tests: 313 tests passed.
- Mobile typecheck and tests passed; iOS and Android Expo exports completed.
- Fresh Python virtualenv `make check`: 291 tests passed; invariants, STATUS,
  and regression checks passed.
- `git diff --check`, README local-link validation, image readability, and a
  credential-pattern scan passed.

## Eval impact

None. No pipeline, thresholds, fixtures, labels, catalogue, evaluator, or
baseline changed; all reported measurements remain unchanged.

Traps: A live-provider screenshot proves one integration path only. Do not call
it an accuracy benchmark, a physical-device run, or evidence that the separate
estimate lane succeeded. Never add the API key to the repository or logs.
