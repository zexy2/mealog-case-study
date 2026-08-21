# Live vision recording handoff

Handle: `codex`
Issue: #3
Branch: `agent/codex/vision-provider-recording`

## State

The default `gemini-flash-lite-latest` run completed all 9 samples and wrote
9 real fixtures. `python scripts/status.py` regenerated `STATUS.md`; the
`Real vision provider` probe is now `✅ working` with 9 non-synthetic responses.

The `gemini-flash-latest` comparison run wrote 3 of 9 fixtures:
`n5k_0001`, `n5k_0002`, and `pkg_0001`. Three attempts then received HTTP 503
(`currently experiencing high demand`) at `tr_0001`. The recorder stopped on
each error, so no sample was silently dropped and no invalid fixture was
written. The full-model comparison is incomplete; no PR was opened.

## Run cost and wall time

All calls used the free tier, estimated provider cost `$0.00`.

| Run | Recorded | Requests attempted | Wall time | Result |
|---|---:|---:|---:|---|
| `gemini-flash-lite-latest` | 9/9 | 9 | 35.54s | complete |
| `gemini-flash-latest` attempt 1 | 0/9 | 1 | ~7s | HTTP 503 at `n5k_0001` |
| `gemini-flash-latest` attempt 2 | 3/9 | 4 | ~44s | HTTP 503 at `tr_0001` |
| `gemini-flash-latest` attempt 3 | 0 additional | 1 | ~23s | HTTP 503 at `tr_0001` |

Total observed attempts: 15. The stated 20-request full-model budget leaves
five attempts, while six full-model samples remain. No further call was made
because completing the set could exceed the stated daily quota.

## Verification

Validated 12 written fixtures: `provider=gemini`, matching `model_id`,
`prompt_version=p2`, `_synthetic=false`, and no nutrient fields. The offline
gate passed through status; `make check` then failed only its expected
regression guard because live labels changed V3 from `39.14%` to `240.87%`
for western and from `0.00%` to `33.52%` for mediterranean. The baseline was
not changed.

## Next

After the provider's quota or availability window permits, record the six
remaining `gemini-flash-latest` samples. Then validate all 18 fixtures, run the
comparison, decide the baseline update separately, and open the PR.

## Traps

Do not claim the full-model comparison is complete: repeated 503 responses
left six samples missing. Do not exceed the 20-request budget, fabricate
fixtures, or alter the regression baseline just to make `make check` green.
The API credential was used transiently and is not in repo artifacts; rotate
it because it was exposed in the conversation and once echoed by the PTY.

