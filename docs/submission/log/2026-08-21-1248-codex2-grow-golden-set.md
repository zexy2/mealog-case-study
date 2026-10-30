# Golden-set growth handoff

Agent: codex2
Issue: #2
Claim: #82
Branch: `agent/codex2/grow-golden-set`

## State

The branch is clean at `1b245e8`; no manifest or fixture files were changed.
The source-selection pass found 16 Nutrition5k overhead RGB records, taking the
set from 9 toward 25 while covering all six evaluator cuisine buckets. Image
bytes were fetched into `/tmp/n5k-candidates` and SHA-256 verified locally; no
images are intended for Git.

Selected records, in proposed bucket order:

| bucket | Nutrition5k record | image SHA-256 |
|---|---|---|
| western | `dish_1562691032` | `3db9f973fb79d36d060a9c218bd83d3f91c9ab7f55dda87f6ec21faf34f91970` |
| western | `dish_1563207364` | `1215171aa64c9781b3bf8b83c9e18b083411ec6eca68653f0afa3a692201e24f` |
| western | `dish_1566838407` | `f040af5a2af7dd6f20037cc7dbc1c94ee5ed2d79240381754e71d7f99f33eaa5` |
| mediterranean | `dish_1563216717` | `20da11d911e9710ac037c2ffbf846ea3199660da457838b9033e9d4f8a3bf035` |
| mediterranean | `dish_1563216739` | `TODO: re-fetch before manifest insertion` |
| mediterranean | `dish_1560802764` | `fcc74eb4c65c6fb2533a7f388605c213f8c08477b8e96fd3212bc4afdfcd493f` |
| east_asian | `dish_1561662562` | `84505d850c33a00898e424208eaedc737fa0eb4f735be726485b0f2c003fb9e3` |
| east_asian | `dish_1562956510` | `cf992b64df306eec146a47b539a78bd492dc3d986ef9ffbccf04355fbf5919d9` |
| east_asian | `dish_1560543755` | `b4e6c27d3b7812a3c0042c1fdf1025db2e1b2b12d3e53e9bf8bc3ee19bc42e68` |
| south_asian | `dish_1567538303` | `5ea95f93762c30ea8d6925f7fbf94134394bd968e1068036e559f85aef9bf584` |
| south_asian | `dish_1561405389` | `61e83ad2bcb9e9904ea29015e460652e03d9e72b3183625b183784c0de847269` |
| south_asian | `dish_1564690194` | `be057aae7123253e35c4ffd7c683e9195752a2ca1a76b08403950f74b7d18dc6` |
| latin_american | `dish_1561753075` | `51c5ae1d1a1519d265ecf709689719f934d2f091f5627401c82b4b79fe2c882c` |
| latin_american | `dish_1561752996` | `125276b2106fce2e0f06f68245d9a1de6a42f9aed4e6501e1eea646a088fb0fb` |
| latin_american | `dish_1561753432` | `379521507e5c40f70d9809d73609e0a4718627bb4dfdb66abbccd850670ef6a1` |
| other_mixed | `dish_1565204891` | `336fd7c3eedddf9651e34a48c900db6adfaaf9fc914e8ec96c9f7c462995381b` |

`dish_1563216739` was selected but not downloaded in the first pass; verify
its current bytes before adding the row. The source URL for every candidate is
the official Nutrition5k metadata CSV and its matching overhead `rgb.png`; the
licence is CC BY 4.0 (Nutrition5k). Exact catalogue mappings should be limited
to source ingredient names such as `scrambled eggs`, `white rice`, `chicken
breast`, `olive oil`, and `apple`; retain all other scale-weighed ingredients
as unmapped with their `ingr_N_name+ingr_N_grams` provenance.

## Blocker

`GEMINI_API_KEY` is unset in the execution environment, and no alternate
credential is configured. Running the live recorder is therefore impossible.
Do not hand-author fixtures: `scripts/check_invariants.py` requires one
recorded fixture per manifest sample, and the task explicitly requires
`gemini-flash-lite-latest`, four-second pacing, and idempotent skip behavior.

## Next

Make `GEMINI_API_KEY` available to the recorder without committing or printing
it. Re-fetch `dish_1563216739`, add the 16 rows to
`eval/golden/manifest.jsonl`, run the existing image fetcher, run
`scripts/record_golden_fixtures.py --model gemini-flash-lite-latest`, and
verify all new fixtures are non-synthetic. Do not edit
`eval/reports/baseline.json`; regenerate `STATUS.md`, run the offline
scorecard, and include before/after numbers in the PR body.

Traps: do not add manifest rows before live fixtures exist; CI's D4 invariant
will fail. Do not use the older `dish_155...` IDs from the first candidate
pass—those overhead image URLs returned 404. Do not reset the baseline while
#78 is decomposing the current score.
