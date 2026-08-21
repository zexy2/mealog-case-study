# mealog compared with EatBetter

This is a bounded comparison, not a claim that one product wins every
dimension. EatBetter evidence comes only from its [public App Store
listing](https://apps.apple.com/us/app/eatbetter-ai-food-journal/id6639614109)
and its public positioning. Nothing here infers EatBetter's model, catalogue,
storage, thresholds, or retry semantics.

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
separately and must surface the neighbour while still abstaining.

**Example.** The `baked beans` negative row forbids Turkish
`tr.kuru_fasulye`; the resolver must abstain rather than turn a regional
near-neighbour into a logged food. The same rule is exercised by the unknown
`zzzz nonexistent dish` test.

## 2. Abstention instead of silent wrong logging

**What is better.** mealog asks for clarification when it cannot support a
safe match. EatBetter publicly optimises for scan-first convenience — its
listing says users can “simply snap a photo” for nutrition feedback — so this is
a deliberate safety trade-off against that public workflow, not a claim about
EatBetter's implementation.

**Why it is better.** A visible deferral preserves an honest log boundary. A
wrong food and its calories look complete while being harder to notice or
repair. The cost is friction and lower automatic coverage.

**How it is measured.** The current offline V3 replay on **n=80** golden
samples reports **6% coverage**: **5/80** samples auto-accept and **75/80** ask.
The evaluator change in open [PR #168](https://github.com/zexy2/mealog-case-study/pull/168)
will change calorie eligibility for partial-truth rows, so covered calorie MAPE
is **pending** a post-#168 run and is not guessed here. Coverage and action counts
do not need that calorie-denominator correction.

**Example.** `jp_0002` contains three foods absent from the `ja_JP` pack. V3
returns three `ABSTAIN` items and `action=ask`; it does not save a Japanese food
chosen merely because it was the nearest available record.

## 3. Portion uncertainty as p10–p90, not a hidden point

**What is better.** mealog returns a median `grams` estimate together with
`grams_p10` and `grams_p90`. Stronger evidence narrows the band; an assumed or
unknown-density portion stays visibly wide. EatBetter's public reviews mention
that portions can be off and editing is quick; mealog exposes the uncertainty
before an edit rather than hiding it behind one number.

**Why it is better.** Portion error directly changes calorie error. A band tells
the user whether the number came from a printed serving, a catalogue prior, or a
weak density assumption. It makes the uncertainty available to review and to
future confidence gating.

**How it is measured.** `server/tests/test_portion.py` asserts the p10–p90
contract for known density, unknown density, packaged serving evidence, and
provenance. The exact current fixture outputs are deterministic and offline;
calorie MAPE remains pending the evaluator correction above.

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
**n=8**, south_asian **n=16**, and latin_american **n=16**. Calorie MAPE values
are **pending** the open partial-truth evaluator fix in #168; publishing the
pre-fix values would mix two denominators.

**Example.** In the current V3 replay, western is **17% covered on n=12** while
east_asian is **0% covered on n=16**. A single mean would hide that the Japanese
market currently has no committed V3 meals in this set, so the reviewer sees
where catalogue coverage fails.

## 5. Auditable food, source, alternatives, confidence, and grams

**What is better.** A mealog result carries the matched `food_id`, ranked
`candidates`, resolver `confidence`, exact `grams`, p10–p90 grams, and portion
provenance. The source is auditable by joining that ID to its locale-pack record
(`CanonicalFood.source` and `pack.yaml.nutrition_source`); it is not an invented
model citation or a claim of a durable audit database.

**Why it is better.** A reviewer can challenge identity, alternatives, or mass
before trusting the total. The trace shows which decision produced the number,
while EatBetter's public listing is used here only to describe its scan-and-
feedback positioning, not its internal result schema.

**How it is measured.** The fields are defined in `ResolvedItem` and rendered
by the mobile review path. `server/tests/test_portion.py` checks that portion
provenance reaches the resolved item, while `server/tests/test_retrieval_eval.py`
checks candidate ranking and abstention. The current tree has **69/69** food
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
why this portion is narrower than a catalogue fallback.

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

**How it is measured.** The current tree has **69/69** sourced food rows in
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

**What is better.** EatBetter has the practical coverage advantage in this
comparison: its public listing positions photo scanning as a general meal
workflow, while mealog can accept only the **69 canonical foods** in its **3**
locale packs and must ask or abstain outside them. This concedes user-facing
long-tail breadth without claiming an EatBetter catalogue count or internal
matching policy.

**Why it is better.** A long-tail dish missing from mealog creates a question
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
or `python eval/retrieval_eval.py` against committed fixtures and labels. The
current **n=80** golden set is real according to `STATUS.md`, but the evaluator
partial-truth correction in #168 is still open. Therefore every affected
calorie MAPE figure remains explicitly pending; no pre-correction replacement
is published here.
