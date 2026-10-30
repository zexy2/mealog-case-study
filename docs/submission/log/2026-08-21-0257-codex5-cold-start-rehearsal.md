# Session log — issue #49

- Agent: `codex5`
- Branch: `agent/codex5/cold-start-rehearsal`
- Claim: [#50](https://github.com/zexy2/mealog-case-study/issues/50)
- Parent issue: [#49](https://github.com/zexy2/mealog-case-study/issues/49)

## State

The in-scope Docker path is implemented in commit `2d4e3d1` and pushed. The
README setup/how-to-run/troubleshooting sections remain locked by lower-numbered
claim #32; no README line was changed. No PR was opened because issue #49's
definition of done requires every command to be documented, and the literal
Run A command currently fails on this host before the venv exists.

## Exact rehearsal evidence observed

Run A, following the current README literally on a clean clone:

```text
+zsh:1> python -m venv .venv
zsh:1: command not found: python
```

Run A with the pinned interpreter name available on this host (`python3.11`),
then the README install/eval/test/check commands, completed with:

```text
56 passed in 1.32s
all architectural invariants hold
STATUS.md matches the repository
no per-cuisine regression in V3
```

Run B against the original compose file started only Postgres and failed:

```text
curl: (7) Failed to connect to localhost port 8000 after 0 ms: Couldn't connect to server
```

After commit `2d4e3d1`, the compose API smoke path passed with no
`GEMINI_API_KEY`:

```text
{"status":"ok","vision":"fixture"}
{"idempotency_key":"compose-smoke-2","locale":"en_US","cuisine":null,"items":[{"query":"grilled chicken","food_id":"us.chicken_breast_grilled","candidates":[{"food_id":"us.chicken_breast_grilled","name":"Grilled chicken breast","score":1.0}],"grams":120.0,"grams_p10":90.0,"grams_p90":162.0,"confidence":1.0,"nutrients":{"kcal":198.0,"protein_g":37.2,"carb_g":0.0,"fat_g":4.3}},{"query":"white rice","food_id":"us.rice_white_cooked","candidates":[{"food_id":"us.rice_white_cooked","name":"White rice, cooked","score":1.0}],"grams":240.0,"grams_p10":108.0,"grams_p90":420.0,"confidence":1.0,"nutrients":{"kcal":312.0,"protein_g":6.5,"carb_g":67.7,"fat_g":0.7}}],"totals":{"kcal":510.0,"protein_g":43.7,"carb_g":67.7,"fat_g":5.0},"action":"auto_accept","question":null,"config":"V3"}
```

The text request included fixture-only `sample_id: n5k_0001` alongside the text,
because the current fixture adapter rejects arbitrary text without a recorded
fixture key. The adapter/API are outside claim #50's scope.

Traps: Do not claim issue #49 is complete while Run A still requires the
undocumented `python3.11` substitution or while the README lock is held by #32.
Do not use an arbitrary text-only curl request with fixture mode: it returns
HTTP 500 because `FixtureVision` requires image bytes or a sample ID. Do not
edit README until #32 releases its lower-numbered lock and #50 is widened.
