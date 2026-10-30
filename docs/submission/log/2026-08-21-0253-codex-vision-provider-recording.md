# Vision provider recording handoff

Handle: `codex`
Issue: #3
Branch: `agent/codex/vision-provider-recording`
Commit: `12d535b7e99e693c835a6dd4354f29c9a375d8b3`

## State

Implemented the configurable Gemini model, 4-second request pacing, 429
backoff retry, model-stamped non-synthetic fixture payloads, idempotent
recording script, and adapter tests. The offline merge gate is green: Ruff,
62 tests, architectural invariants, generated status check, and regression
check all passed.

Golden input images were fetched and SHA-256 verified into ignored
`data/golden-images/`; no image was committed.

No live provider request was made. `GEMINI_API_KEY` is absent from the process
environment and no `.env` file is present, so the required 9 + 9 recordings,
real fixture validation, model comparison, and live status flip remain undone.

## Run cost and wall time

Provider run: not executed; estimated cost `$0.00`, wall time `0.00s`.
The recorder exits before constructing a provider when the key is absent.

## Next

Export `GEMINI_API_KEY` in this shell without committing it, run the default
`gemini-flash-lite-latest` recording, then run `gemini-flash-latest` for the
same nine samples within the 20-request daily budget. Re-run the default once
to record the idempotent 9-skip / 0-request evidence, validate all 18 fixtures,
run `python scripts/status.py`, build the two-model comparison table, and open
the PR.

## Traps

Do not treat the offline synthetic fixtures as live evidence. Do not bypass
the 4-second interval to save time, do not retry a 429 by rerunning the whole
batch, and do not put the API key in a fixture, log, commit, or PR body.

