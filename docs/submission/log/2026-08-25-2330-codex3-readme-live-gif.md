# README live-provider GIF

Agent: `codex3`
Claim: #395
Branch: `agent/codex3/readme-live-gif`
Base: `origin/main@1954f1d`

## Done

- Replaced the static README Simulator screenshot with a user-operated iOS
  Simulator screen recording converted to an optimized looping GIF.
- Trimmed the recording at 27 seconds, accelerated playback 2.5x, and encoded
  it at 480x1042, 10 fps, 96 colors, and 4.18 MB.
- The visible flow covers Add, live loading, Review, an explicitly unverified AI
  estimate, portion confirmation, save, and Day.
- Updated the caption to identify the live model and distinguish one integration
  observation from an accuracy benchmark.

## Runtime boundary

- `gemini-3.6-flash` returned HTTP 429 because its free-tier request quota was
  exhausted during recording attempts.
- A direct credential-safe probe to `gemini-3.1-flash-lite` returned HTTP 200;
  the Node service was restarted with that model for the successful recording.
- Demo mode was disabled. Execution was iOS Simulator, not a physical device.
- The API key, original MOV, and temporary conversion files were not committed.

## Verification

- GIF decoded without errors; duration 11.9 seconds and final size 4,179,963
  bytes.
- `git diff --check`, generated STATUS check, and secret guard passed.
- Fresh Python 3.11 virtualenv `make check`: 291 tests, lint, invariants, STATUS,
  and V3 regression guard passed.

## Eval impact

None. Documentation media only; no source, model default, pipeline, threshold,
fixture, label, catalogue, evaluator, or baseline changed.

Traps: Do not describe this accelerated single Simulator recording as a
physical-device run or an accuracy benchmark. The shipped default model remains
unchanged; the recording used `gemini-3.1-flash-lite` only because the default
model quota was exhausted. Never commit the API key or source recording.
