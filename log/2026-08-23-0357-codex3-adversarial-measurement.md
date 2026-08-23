# Adversarial input measurement — issue 233

## Run boundary

- Base: origin/main at 6b05422dfdc4e29d0d77e833637f2c9f5fd7235f.
- Agent: codex3.
- Claim: issue 234.
- Server: current Node service, built from this base, VISION_PROVIDER=gemini,
  HTTP port 3110.
- API key: GEMINI_API_KEY was present before the run. The value was never
  printed, saved, returned, or logged.
- Input boundary: every image was submitted as multipart/form-data with the
  same fields the mobile photo client sends: idempotency_key, locale=tr,
  config=V3, and an image part.
- Repeats: three distinct idempotency keys per image, 18 HTTP calls total.
- No source, locale, evaluator, golden, baseline, threshold, prompt, or CI file
  changed. Only this log is a repository artifact.

The issue specified a manifest.jsonl, but no manifest was present in
/tmp/mealog-adversarial/. The six supplied filenames and their visible contents
were used as the measurement rows; all six are adversarial/refusal cases.
There is no real_food accept control in this run, so false-refuse performance
cannot be measured.

## Per-input result

The table reports the stable result repeated on runs 1, 2, and 3. Complete
sanitized per-run records are in:

- /tmp/mealog-adversarial-run/adversarial-run.txt
- /tmp/mealog-adversarial-run/adversarial-results.jsonl
- /tmp/mealog-adversarial-run/false-accept-diagnostics.jsonl

The client screen is derived from the current App.tsx routing rule. An ask
response containing any ABSTAIN item routes to Abstention; an ask response
with no items routes to Review. A resolved item in a mixed response is still a
false accept at the server-result boundary even when the client does not
auto-create a Day record.

| Input | Category / expected | HTTP; action; degraded | Resolved food_id and fields | Total kcal | Client screen | Day record | Stability / verdict |
|---|---|---|---|---:|---|---|---|
| BOS TABAK.png | empty_plate / refuse | 200; ask; false | none; items=[] | 0 | Review | no | 3/3 identical; correct refusal |
| BIR BARDAKSU.png | non_food, glass of water / refuse | 200; ask; false | ABSTAIN; confidence 0; 0 g (p10 0, p90 0); quantity null; not_applicable / not_applicable | 0 | Abstention | no | 3/3 identical; correct refusal |
| ANAHTARLIK KALEM.png | non_food, keys and pen / refuse | 200; ask; false | none; items=[] | 0 | Review | no | 3/3 identical; correct refusal |
| TELEFON EKRANINDA YEMEK.png | screen, pilav on phone / refuse | 200; ask; false | tr.pilav; confidence 1; candidate score 1; 180 g (p10 117, p90 261); quantity null; catalogue_default / catalogue.default_serving_g=180. Two other items were ABSTAIN. | 271.8 | Abstention | no | 3/3 identical; false accept |
| OYUNCAK YEMEK.png | toy, plastic food / refuse | 200; ask; false | tr.lahmacun; confidence 1; candidate score 1; 140 g (p10 91, p90 203); quantity null; catalogue_default / catalogue.default_serving_g=140. Two other items were ABSTAIN. | 340.2 | Abstention | no | 3/3 identical; false accept |
| BULANIK RESIM.png | blurred, unrecognisable food-like frame / refuse | 200; ask; false | ABSTAIN; confidence 0; 0 g (p10 0, p90 0); quantity null; not_applicable / not_applicable | 0 | Abstention | no | 3/3 identical; correct refusal |

All 18 responses had action ask and degraded=false. No response reached
auto_accept and no Day record would be created. The two false-accept categories
therefore produced a number-bearing resolved item but did not silently persist
it through the current top-level action.

## 2x2 measurement

The matrix is per run, because each supplied image was run three times. “Number”
means at least one resolved catalogue food with non-zero nutrition in the
server response; it does not mean that the current ask action persisted a Day
record.

| | Number-bearing resolution | Refused or asked without a number |
|---|---:|---:|
| Should refuse: 18 runs | 6 false accepts | 12 correct refusals |
| Should accept: 0 runs supplied | not measurable | not measurable |

At image level, 2 of 6 refusal images were false accepts and 4 of 6 were
correct refusals. Every category was stable across all three runs. The
false-refuse column is not zero; it is unmeasured because the supplied set has
no expected accept row. This is not evidence that the system preserves real
food recall.

## False-accept stage attribution

### Phone screen showing pilav

The returned resolved item had tr.pilav, an exposed candidate score of 1, and
resolver confidence 1. The catalogue-default portion then produced 180 g,
117–261 g, and 271.8 kcal. The observable path is retrieval matched the
catalogue candidate and the resolution confidence gate allowed the item into
the response. The top-level action stayed ask because other observations were
ABSTAIN, so the mobile route was Abstention and Day was not written.

### Plastic toy food

The returned resolved item had tr.lahmacun, an exposed candidate score of 1,
and resolver confidence 1. The catalogue-default portion then produced 140 g,
91–203 g, and 340.2 kcal. The observable path is retrieval matched the
catalogue candidate and the resolution confidence gate allowed the item into
the response. Again, action stayed ask because the other observations were
ABSTAIN, so no Day record was created.

The raw provider surface forms and envelope are intentionally not retained by
the service and were not inspected or logged in this run. Therefore it is not
possible to prove from the safe MealLog response whether the perception stage
described the screen/toy as food, rather than attributing that part of the
failure to retrieval. The measurable gate failure is downstream: a candidate
score of 1 and confidence 1 were sufficient to produce a nutrient-bearing
catalogue item for both adversarial inputs.

## Existing-signal separation

There are no accepted-real-food rows in the supplied set, so the real-food
distribution is empty (n=0) for every signal. Accepted-adversarial means the
six resolved false-accept items across the two categories and three repeats.

| Signal | Accepted real food | Accepted adversarial |
|---|---|---|
| Sample size | n=0 | n=6 resolved items |
| Vision confidence exposed in response | not measurable | not exposed separately from resolved confidence |
| Resolved confidence | not measurable | min=1, mean=1, max=1 |
| Exposed candidate / retrieval score | not measurable | min=1, mean=1, max=1 |
| degraded | not measurable | false for 6/6 |
| action | not measurable | ask for 6/6 |
| portion_source | not measurable | catalogue_default for 6/6 |
| grams | not measurable | tr.pilav 180 g for 3/3; tr.lahmacun 140 g for 3/3 |
| p10–p90 | not measurable | pilav 117–261 g for 3/3; lahmacun 91–203 g for 3/3 |

The available signals do not separate the observed adversarial false accepts:
both have maximum confidence and candidate score, non-degraded responses, and
the ordinary catalogue-default portion source. There is no accepted-real-food
control against which to claim that any signal separates real food from
adversarial input.

## Blurred diagnostic

Variance of the grayscale 3x3 Laplacian was computed offline from the supplied
PNG bytes, for diagnosis only. No threshold was selected or wired into the
system.

| Input | Dimensions | Laplacian variance |
|---|---:|---:|
| BULANIK RESIM.png | 398 × 325 | 117.625680 |

The blurred image was stable ABSTAIN on all three API runs. This single value
does not establish a useful operating threshold.

## Verification

- GEMINI_API_KEY presence check: PRESENT; value not exposed.
- npm ci in the throwaway measurement worktree: passed; 281 packages, 0 audit
  vulnerabilities.
- npm run build: passed.
- GET /health: HTTP 200, status=ok, vision=gemini.
- API calls: 18/18 HTTP 200, 18/18 action ask, 18/18 degraded=false.
- git diff --check: passed.
- Hosted client execution was not claimed. The screen column is the current
  App.tsx routing result applied to the observed response shape.
- No physical device or emulator was used.

## HANDOFF

State: adversarial measurement completed; two refusal categories produced stable
false accepts, four categories produced stable refusals, and real-food recall
remains unmeasured.
Done: all six supplied images were run three times through the current Node
multipart boundary; 2x2, false-accept stage attribution, signal distributions,
and blurred Laplacian diagnostic recorded.
Next: decide whether to add a real_food control set before designing any gate.
Do not tune from this six-image refusal-only set.
Traps: the supplied directory had no manifest.jsonl and no real_food row. Do not
call 12 correct refusals a complete safety result, do not treat action ask as
proof that the resolved food_id was safe, and do not turn the Laplacian value
into a threshold.
Branch: agent/codex3/adversarial-measurement
Commit: 2384863 contains the measurement log; the final branch tip is stated in the issue handoff.
