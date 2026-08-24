# mealog compared with EatBetter

This is a bounded comparison, not a claim that one product wins every
dimension or beats EatBetter overall. EatBetter evidence comes only from its
[public App Store listing](https://apps.apple.com/us/app/eatbetter-ai-food-journal/id6639614109)
and observed public product surfaces. Those surfaces show a photo-first logging
workflow and user-facing feedback/editing; nothing here infers EatBetter's model,
catalogue, storage, thresholds, or retry semantics.

Every comparison below uses the same four questions: what is better, why it is
better, how it is measured, and which repository example makes the difference
concrete.

## 1. Closed-set resolution and `ABSTAIN`

**What is better.** mealog's resolver returns a canonical catalogue `food_id`
from retrieval candidates or returns `ABSTAIN`. It never emits a new food ID or
a free-form nutrition answer. This is a safety property mealog can demonstrate;
it is not a claim that EatBetter lacks an equivalent.

**Why it is better.** [D1](decisions.md#d1--the-model-never-produces-a-nutrient-number)
makes canonicality a boundary in code, not a prompt instruction. A food outside
the locale pack becomes a visible miss instead of a plausible identifier. The
cost is lower catalogue coverage.

**How it is measured.** `server/tests/test_resolution_is_closed_set.py` covers
two unknown-input cases. The offline retrieval set has **145 variants**: **122
positive** and **23 negative/confusion** rows. Blended retrieval ranks the target
first for **122/122 positive rows (100.0% Recall@1)**, reaches it in the top five
for **122/122 (100.0% Recall@5)**, and records **MRR 1.000**. Its 22 deliberately
absent rows produce **0/22 false accepts**; confusion rows are checked
separately and must surface the neighbour while still abstaining. This is a fixed
ambiguity guard, not a claim that the 145 variants cover every newly added
catalogue entry; catalogue-growth evidence must name its own sample set.

**Example.** The `baked beans` negative row forbids Turkish
`tr.kuru_fasulye`; the resolver must abstain rather than turn a regional
near-neighbour into a logged food. The same rule is exercised by the unknown
`zzzz nonexistent dish` test.

## 2. Abstention instead of silent wrong logging

**What is better.** mealog asks for clarification when it cannot support a
safe match. EatBetter's public product surface presents scan-first convenience,
including snapping a photo for nutrition feedback; this is a deliberate safety
trade-off against observed public workflow, not a claim about EatBetter's
implementation.

**Why it is better.** A visible deferral preserves an honest log boundary. A
wrong food and its calories look complete while being harder to notice or
repair. The cost is friction and lower automatic coverage.

**How it is measured.** The current offline V3 replay on **n=80** golden
samples reports **15% coverage**: **12/80** samples commit and **68/80** ask.
After the TypeScript confidence gate in merged [PR #184](https://github.com/zexy2/mealog-case-study/pull/184)
and the scorecard refresh in merged [PR #185](https://github.com/zexy2/mealog-case-study/pull/185),
worst/mean calorie MAPE is **12.7%** over **2/2** complete-positive rows. The
other 72 manifest rows have partial truth and stay outside the calorie denominator;
seven of those are covered but remain diagnostic only.

**Example.** `jp_0002` contains three foods absent from the `ja_JP` pack. V3
returns three `ABSTAIN` items and `action=ask`; it does not save a Japanese food
chosen merely because it was the nearest available record.

## 3. Portion uncertainty as p10–p90, not a hidden point

**What is better.** mealog returns a median `grams` estimate together with
`grams_p10` and `grams_p90`. Stronger evidence narrows the band; an assumed or
unknown-density portion stays visibly wide. EatBetter's observed public product
surface exposes feedback and editing affordances; mealog exposes the uncertainty
before an edit rather than hiding it behind one number. No EatBetter internal
portion method is inferred.

**Why it is better.** Portion error directly changes calorie error. A band tells
the user whether the number came from a printed serving, a catalogue prior, or a
weak density assumption. It makes the uncertainty available to review and to
future confidence gating.

**Observed counting cases (2026-08-22).** EatBetter was observed on both images:
one over-count of three against a user-confirmed count of two, and one correct
count of two. mealog was observed on the second image only, where it resolved one
simit at **100 g / 329 kcal** — reproduced three times through the API and three
times on a physical device at close, medium, and long framing. mealog was never
run on the first image. One product has two data points, the other has one; no
counting comparison can be drawn.

**How it is measured.** `server/tests/test_portion.py` asserts the p10–p90
contract for known density, unknown density, packaged serving evidence, and
provenance. The Node path now preserves normalized `quantity` and `unit` on each
resolved item. Live verification on commit `acfa6dd` (**2026-08-23**, **12**
requests, all HTTP 200) found that `A2.jpg` (two simits, no text) returned
`quantity: 1`, `portion_source=catalogue_default_scaled`, **75–135 g**, and
**329 kcal**, with the same result across **3/3** runs. This is an open, measured
photo-path count defect tracked in
[#218](https://github.com/zexy2/mealog-case-study/issues/218): the provider's
quantity claim is treated as evidence instead of falling back to unknown
`quantity: null` and `catalogue_default`. The verified `C7.jpg` repeated-
observation case still returned one `tr.ayran` with `quantity: null` and
`catalogue_default`; the Part A text scenarios are **8/8** passing. `POST
/v1/meals/correct` offers item-scoped catalogue-backed count, identity, and
portion clarification;
the server recomputes the changed item rather than trusting client grams or
nutrients. The exact current fixture outputs are deterministic and offline. The
current V3 calorie result is **12.7% MAPE over n=2 scored rows**; it is not a live
provider accuracy claim.

**Example.** `pkg_0001` resolves to `us.yogurt_greek_plain` with `grams=170`,
`p10=153`, `p90=187`, and `portion_source=label_serving`. The recorded serving
provenance is `dataset=Open Food Facts; record_id=0011110107176;
field=serving_size`. The UI therefore shows a 153–187 g band, not an
unqualified 170 g fact.

## 4. Worst-cuisine reporting instead of only mean accuracy

**What is better.** mealog makes the weakest cuisine bucket the headline and
keeps coverage beside it. It does not collapse market shift into one mean. This
is a measurement choice we can prove; it is not an assertion that EatBetter
does not inspect its own markets.

**Why it is better.** A mean can improve while one cuisine becomes unusable.
[D3](decisions.md#d3--headline-metric-is-the-worst-cuisine-and-accuracy-is-read-with-coverage)
therefore requires worst-bucket MAPE, spread, coverage, and bucket size to be
read together.

**How it is measured.** `eval/harness.py` emits `n`, coverage, Item F1, kcal
MAPE, within-20%, and FP rate for every cuisine. The current V3 sample sizes are
western **n=12**, mediterranean **n=12**, east_asian **n=16**, other_mixed
**n=8**, south_asian **n=16**, and latin_american **n=16**. Current V3 coverage is
**15% (12/80)**, Item F1 is **0.15**, FP rate is **86.0%**, and calorie MAPE is
**12.7% over n=2 scored complete-positive rows**. Empty cuisine calorie buckets
render `—`; they are not zero-error results.

**Example.** In the current V3 replay, western is **42% covered on n=12** while
east_asian is **6% covered on n=16**. A single mean would hide that the Japanese
bucket has almost no committed V3 meals in this set, so the reviewer sees where
catalogue coverage fails.

## 5. Auditable food, source, alternatives, confidence, and grams

**What is better.** A mealog result carries the matched `food_id`, ranked
`candidates`, resolver `confidence`, exact `grams`, p10–p90 grams, and portion
provenance. The source is auditable by joining that ID to its locale-pack record
(`CanonicalFood.source` and `pack.yaml.nutrition_source`); it is not an invented
model citation or a claim of a durable audit database.

**Why it is better.** A reviewer can challenge identity, alternatives, or mass
before trusting the total. The trace shows which decision produced the number,
while EatBetter's observed public workflow is used here only to describe its
scan-and-feedback positioning, not its internal result schema.

**How it is measured.** The fields are defined in `ResolvedItem` and rendered
by the mobile review path. `server/tests/test_portion.py` checks that portion
provenance reaches the resolved item, while `server/tests/test_retrieval_eval.py`
checks candidate ranking and abstention. The current tree has **99/99** food
rows with a non-empty food source across **3** locale packs.

**Example.** The current `pkg_0001` trace is:

```text
food_id:             us.yogurt_greek_plain
candidate score:     0.939
confidence:          0.963
grams:               170.0
grams_p10..p90:      153.0..187.0
catalogue source:    USDA SR
portion provenance:  dataset=Open Food Facts; record_id=0011110107176; field=serving_size
```

The candidate list remains available for review; the serving evidence explains
why this portion is narrower than a catalogue fallback. The `two pieces` evidence
used in focused text fixtures does not prove that Gemini visually counted two
pieces in a live image.

## 6. User-scoped idempotency

**What is better.** Repeating a request with the same client-generated key
returns the same result for that user, while the same key from another user is
not treated as the same meal. This is a correctness property mealog measures
directly; no EatBetter internal retry behavior is asserted.

**Why it is better.** Mobile uploads can be retried after a lost response. A
key scoped only globally can merge two users' meals; a key ignored entirely can
duplicate one user's meal. mealog makes `(user_id, idempotency_key)` the cache
boundary in the current reference API.

**How it is measured.** `server/tests/test_idempotency.py` checks an identical
replay pair, a multipart replay with **one pipeline call**, and a cross-user
pair with **two distinct results**. These are deterministic request tests, not a
claim about production-scale storage; the current reference cache is in-memory.
The optional `X-User-Id` header selects the cache namespace and defaults to
`demo-user`; it is not an authentication mechanism. The edge exposes a liveness
health check and the adapter has an event hook, but durable request metrics and
traces are not implemented. A degraded provider result is now propagated through
the API and mobile result and forced to `review`; it cannot become `auto_accept`.

**Example.** The test sends `shared-key` as `user-a` for `tr_0001` and as
`user-b` for `tr_0002`; both requests execute and keep different bodies. A
second multipart submission of the same image returns the first body without a
second pipeline execution.

## 7. Nutrition provenance and licence enforcement

**What is better.** Nutrition numbers come from canonical food records with a
declared source, and each locale pack declares a licence that the loader checks
at runtime. This is stronger than adding a database name after calculation;
the legal boundary is executable.

**Why it is better.** A deployment can refuse data whose commercial rights are
restricted or unknown before serving it. [D2](decisions.md#d2--a-locale-is-a-data-pack-not-code)
keeps market and licence variation in data, while the loader fails closed when
commercial use is not established.

**How it is measured.** The current tree has **99/99** sourced food rows in
**3** packs. `en_US` is `public-domain` and allowed in commercial mode;
`tr` is `restricted-noncommercial` and refused; `ja_JP` is `unverified` and
also refused. `server/tests/test_locale_packs.py` covers declared licence
vocabulary, runtime refusal, cache bypass, and unknown-licence failure; the
invariant checker covers the pack declarations.

**Example.** `load("tr", commercial_mode=True)` raises
`RestrictedPackError` and names both the pack and `MEALOG_COMMERCIAL_MODE`.
The same call for `en_US` is permitted. No provider call is needed to exercise
this provenance and licence boundary.

## Where EatBetter is better: catalogue coverage and long-tail breadth

**What is observed.** EatBetter's public surface depicts a general photo-
logging workflow, while mealog can accept only the **99 canonical foods** in its
**3** locale packs and must ask or abstain outside them. This identifies
mealog's measured coverage limit; it does not claim an EatBetter catalogue
count or internal matching policy.

The Turkish pack contains **53 foods**. Direct inspection of
`locale_packs/tr/foods.jsonl` found no entry for **döner**, **poğaça**,
**börek** (including **su böreği**), **köfte**, **pide**, or **kebap**. In the
**2026-08-22** probe of ten out-of-catalogue images, all ten abstained correctly
with **0 false accepts**; the Turkish examples were döner, poğaça, and su böreği.
This is closed-set boundary evidence, not a new retrieval metric.

**Why it matters.** A long-tail dish missing from mealog creates a question
instead of a one-tap log. That is the real cost of the closed-set guarantee;
preventing a wrong calorie record does not remove the coverage gap.

**How it is measured.** mealog counts canonical IDs from the locale packs and
measures retrieval on the **145-variant** set, including **23** negative or
confusion cases, not just positive recall. A fair EatBetter head-to-head needs a
fixed, public long-tail panel and the same coverage/false-accept definitions;
EatBetter's public listing supplies no comparable catalogue count, so that side
of the breadth measurement is **pending**, not guessed.

**Example.** `jp_0002` produces three abstentions because its foods are absent
from `ja_JP`; the result is honest but not broad. `çay` also demonstrates the
trade-off: the dry-tea neighbour is surfaced for inspection, then the negative
case abstains rather than charging brewed tea against dry-leaf nutrition.

## Evidence boundary

All repository measurements above are offline and reproducible with `make eval`
or `python eval/retrieval_eval.py` against committed fixtures and labels. Fresh
replay at current main `b645b95` reports V3 **12/80 committed**, **68/80 ask**,

Item F1 **0.15**, FP rate **86.0%**, and **12.7% MAPE over 2/2
calorie-eligible/scored rows**; 72 partial-truth rows remain outside that
denominator. Retrieval replay reports Recall@1 **100.0%**, Accept@1 **99.2%**,
MRR **1.000**, and **0/22 false accepts**. The live iOS evidence in [PR #191](https://github.com/zexy2/mealog-case-study/pull/191)
is separate runtime smoke evidence, not offline accuracy, visual counting proof,
or hosted deployment proof. It reran four selected flows, not all twelve gallery
images, and no live multi-item acceptance gate is claimed. EatBetter comparison
remains limited to observed public surfaces; no internal metrics or architecture
are inferred.

This document compares bounded, demonstrated properties. It does not establish
that mealog beats EatBetter overall.
