# mealog compared with EatBetter

This is a comparative answer, not a claim that one product wins every
dimension. It uses EatBetter's public App Store positioning and review patterns;
it does not infer anything about EatBetter's internal model, catalogue, or
storage. Each section states what is better, why, how it is measured, and the
example that makes the difference concrete.

## 1. Closed-set resolution instead of prompted confidence

**What is better.** mealog makes hallucinated food identifiers structurally
impossible: resolution returns a catalogue `food_id` from the candidate set or
`ABSTAIN`. Nutrition is then computed from that identifier, not from a model's
free-form calorie answer.

**Why it is better.** This is [D1](decisions.md#d1--the-model-never-produces-a-nutrient-number)
implemented at the resolver boundary, so it does not depend on a prompt behaving
well. The trade-off is explicit: an item outside the locale pack is a miss and
can only be deferred, rather than silently turned into a plausible food.
The closed-set guarantee does not cover perception: the vision stage can report
an item that was not on the plate, which the resolver may then map to a real
catalogue entry. That is an E3 perception failure owned by the vision stage,
not an invented identifier or nutrition number.

**How it is measured.** The golden-set harness reports the observable `E3`
error distribution, and the retrieval harness separately measures false accepts
on negative queries. The committed golden set has an empty-plate trap; the
menu-photograph and screenshot trap rows requested for the full refresh are not
yet present, so the complete trap-set E3 rate is
`<!-- NUMBER: pending measurement refresh -->`.

**Example.** `trap_0001` has empty truth and is routed to `ask`, while
`test_resolution_is_closed_set.py` proves an unknown query returns `ABSTAIN` or
a food already in the pack. A wrong identifier cannot be invented to make the
coverage number look better.

## 2. Abstention instead of a silent wrong log

**What is better.** When retrieval cannot support a safe match, mealog asks or
abstains instead of committing a silent food entry. EatBetter's [public App
Store listing](https://apps.apple.com/us/app/eatbetter-ai-food-journal/id6639614109?platform=ipad)
promises a deliberately low-friction experience — “No tedious logging — just
scan” — so this is a different product choice, not a claim about its
implementation.

**Why it is better.** [D3](decisions.md#d3--headline-metric-is-the-worst-cuisine-and-accuracy-is-read-with-coverage)
reads accuracy beside coverage. A deferred answer is visible to the user and
does not become a false calorie record; the cost is that fewer meals are
automatically logged.

**How it is measured.** The current V3 replay over
`<!-- NUMBER: pending measurement refresh -->` samples reports
`<!-- NUMBER: pending measurement refresh -->` overall coverage and
`<!-- NUMBER: pending measurement refresh -->` western MAPE after the
packaged-serving correction; both figures are recorded in the [#94 measurement
log](../log/2026-08-21-1323-codex-packaged-serving.md).
The denominator is covered samples only, as defined by `eval/metrics.py`.

**Example.** The committed `ja_JP` samples expose the cost: `jp_0001` asks
after tomato salad and tsukemono abstain, while `jp_0002` abstains all
uncovered items and asks. The system loses coverage rather than writing a
confident Japanese food that the pack does not contain.

## 3. Portion as a distribution, not a point

**What is better.** mealog returns median `grams` with `p10`/`p90`, and the band
is narrower when the evidence is stronger. A printed serving or net weight is
marked as label evidence; an assumed or unknown-density portion remains visibly
uncertain.

**Why it is better.** [D7](decisions.md#d7--portion-is-a-distribution-and-density-belongs-to-the-food)
keeps portion uncertainty in both the review UI and the confidence gate. This
matches the useful part of the EatBetter App Store's public review pattern —
reviewers say portions can be off but editing is quick — while making the
uncertainty visible before the user edits it.

**How it is measured.** The [packaged-serving measurement](../log/2026-08-21-1323-codex-packaged-serving.md)
compares the same offline fixture before and after #94. Its recorded mass,
APE, and p10–p90 bounds are each `<!-- NUMBER: pending measurement refresh -->`.
The earlier diagnostic is retained in the log as historical context, not copied
forward as a current result.

**Example.** `pkg_0001` is Greek yogurt with a printed serving of
`<!-- NUMBER: pending measurement refresh -->` g. The label serving now drives
the estimate; the current V3 western MAPE is
`<!-- NUMBER: pending measurement refresh -->`, rather than the stale pre-#94
diagnostic. `n5k_0002` is the control: its estimate and APE are
`<!-- NUMBER: pending measurement refresh -->` pending refresh.

## 4. Per-cuisine accuracy with the worst bucket as the headline

**What is better.** mealog reports the distribution of performance by cuisine
and leads with the worst cuisine bucket, rather than hiding the weakest market
inside one mean. It is a measurement surface for market expansion, not an
assertion that EatBetter's product team lacks one.

**Why it is better.** Cuisine shift is the risk this project is meant to expose.
The mean can improve while a new market becomes unusable, so [D3](decisions.md#d3--headline-metric-is-the-worst-cuisine-and-accuracy-is-read-with-coverage)
requires the worst MAPE, coverage, and the spread to be read together.

**How it is measured.** `eval/harness.py` emits per-cuisine `n`, coverage, Item
F1, kcal MAPE, within-20% and FP rate, and CI compares each selected cuisine
bucket against the stored baseline. The current V3 worst bucket is western at
`<!-- NUMBER: pending measurement refresh -->` MAPE; the current per-cuisine
table is refreshed by the harness rather than copied from the stale
decomposition in `docs/evaluation.md`.

**Example.** The east-Asian golden samples have
`<!-- NUMBER: pending measurement refresh -->` V3 coverage because the
Japanese pack cannot resolve all their items, while western `pkg_0001` became a
measurable portion fix after its label serving was added. These are different
failure modes that one aggregate number would conflate.

## 5. An inspectable decision trace

**What is better.** The reviewer path exposes the matched canonical record,
alternates, confidence, exact grams, and the portion interval instead of only a
calorie total. The locale pack also retains its nutrition source and licence,
so the calculation has a traceable input boundary.

**Why it is better.** A user can challenge the identity or portion at the point
where it matters. This makes an answer reviewable and correctable; it is not a
claim that EatBetter has no equivalent affordance, and it is not a claim of a
durable audit database that this take-home does not ship.

**How it is measured.** The contract is visible in `ResolvedItem` and the
mobile `ReviewScreen`: `food_id`, `candidates`, `confidence`, `grams`,
`grams_p10`, and `grams_p90` are rendered by the audit panel. The demo also
provides `source_database`; the live server currently keeps pack source and
licence outside that optional UI field, so a durable source-version audit trail
is `<!-- NUMBER: pending measurement refresh -->` rather than an invented
completeness percentage.

**Example.** The demo `pilav` item shows candidate IDs with scores
`<!-- NUMBER: pending measurement refresh -->`,
`<!-- NUMBER: pending measurement refresh -->`, and
`<!-- NUMBER: pending measurement refresh -->`,
`<!-- NUMBER: pending measurement refresh -->` g with a
`<!-- NUMBER: pending measurement refresh -->`–
`<!-- NUMBER: pending measurement refresh -->` g band,
`<!-- NUMBER: pending measurement refresh -->` confidence, and `TURKOMP` as
the source database. The reviewer can see what would change before saving.

## 6. User-scoped idempotent logging

**What is better.** A retry with the same client-generated key returns the same
meal for that user and does not run the pipeline twice. The same key issued by
different users is not treated as the same meal.

**Why it is better.** This addresses the review pattern in the [EatBetter App
Store listing](https://apps.apple.com/us/app/eatbetter-ai-food-journal/id6639614109?platform=ipad)
of meals appearing to log inconsistently across sessions, without claiming that
a review proves an EatBetter defect. The server cache key is
`(user_id, idempotency_key)`, so a network retry is a correctness case rather
than a duplicate-meal lottery.

**How it is measured.** `server/tests/test_idempotency.py` asserts identical
replay bodies, one pipeline call for multipart replay, and distinct results for
the same key from different users. A head-to-head session-loss rate for
EatBetter is `<!-- NUMBER: pending measurement refresh -->`; the public review
pattern is qualitative evidence, not that benchmark.

**Example.** The test sends `shared-key` as `user-a` for `tr_0001` and as
`user-b` for `tr_0002`; both requests survive with different results. A second
multipart submission of the same image returns the first body and leaves the
pipeline call count at one.

## 7. Nutrition provenance and licence enforcement

**What is better.** Nutrition values are attached to canonical records with a
declared source, and each locale pack declares a licence that the loader checks
at runtime. This is stronger than treating a database name as documentation
after the value has already entered a log.

**Why it is better.** A reviewer can ask where a `per_100g` value came from and
whether the pack may be served in the target mode. [D2](decisions.md#d2--a-locale-is-a-data-pack-not-code)
keeps that legal boundary in data, and #46 makes the restricted-pack decision a
runtime refusal rather than a CI-only warning.

**How it is measured.** `scripts/check_invariants.py` checks every pack's
`nutrition_source`, cuisine, and licence vocabulary; `test_locale_packs.py`
checks runtime refusal in commercial mode. The current tree contains
`<!-- NUMBER: pending measurement refresh -->` canonical foods across
`<!-- NUMBER: pending measurement refresh -->` locale packs: USDA FoodData Central is public
domain, TÜRKOMP is restricted-noncommercial, and the Japanese source is
unverified.

**Example.** `load("tr", commercial_mode=True)` refuses the TÜRKOMP pack, while
the en_US USDA pack remains permitted. The fail-closed behavior is a legal and
data-provenance difference that can be exercised without a provider call.

## Where EatBetter is better: catalogue coverage

**What is better.** EatBetter is better on practical catalogue breadth: its
[public product positioning](https://apps.apple.com/us/app/eatbetter-ai-food-journal/id6639614109?platform=ipad)
is to scan meals without manual logging, while
mealog currently carries `<!-- NUMBER: pending measurement refresh -->`
canonical foods across `<!-- NUMBER: pending measurement refresh -->` locale
packs and must
abstain outside them. I am not claiming an EatBetter catalogue count or an
internal matching policy.

**Why it is better.** A long-tail meal that is absent from our pack creates a
question or an abstention, which is real user friction even when it prevents a
wrong calorie record. This is the direct cost of our closed-set guarantee, not a
reason to hide the coverage gap.

**How it is measured.** We count canonical IDs from `STATUS.md` and measure
coverage, recall, and false accepts on the repository's golden and retrieval
sets. The current retrieval run over
`<!-- NUMBER: pending measurement refresh -->` variants reports
`<!-- NUMBER: pending measurement refresh -->` Recall@1 and Recall@5,
`<!-- NUMBER: pending measurement refresh -->` Accept@1, and
`<!-- NUMBER: pending measurement refresh -->` false accepts; those are
surface-form tests, not proof of long-tail coverage. EatBetter's comparable
catalogue coverage is `<!-- NUMBER: pending measurement refresh -->`.

**Example.** `jp_0002` contains foods the `ja_JP` pack does not carry, so all
items abstain. `çay` likewise surfaces the dry-tea neighbour and its
dry-leaf `per_100g` record but still abstains, and `baked beans` is kept apart from Turkish `kuru fasulye`; the
negative-alias tests show the guardrail, while EatBetter's broader scan-first
experience has the coverage advantage.

## Failure cases that make the comparison concrete

**What is better.** mealog turns failure into a visible, testable state rather
than a polished number whose provenance is unclear. That does not mean every
failure is solved: the examples separate portion, catalogue, and regional
confusion errors.

**Why it is better.** A reviewer can see what to fix next — product serving
evidence, a missing locale item, or a negative alias — and can distinguish an
honest abstention from a wrong match.

**How it is measured.** The current offline harness and retrieval evaluation
are deterministic and provider-free. The retrieval set grew with the Turkish
catalogue; [#99](https://github.com/zexy2/mealog-case-study/pull/99) records the
resulting `<!-- NUMBER: pending measurement refresh -->`-variant measurement
and the negative/confusion guard.

**Example.** The representative cases are: `pkg_0001` (historical APE before
the label-serving fix, current APE
`<!-- NUMBER: pending measurement refresh -->`); `çay` matched against
dry tea leaves until the negative-alias case forced an abstention; `baked beans`
versus `kuru fasulye`, where the E10-style regional trap is surfaced and
abstained; and the `ja_JP` samples, where missing coverage produces asks.

## What external accuracy numbers can and cannot tell us

**What is better.** The defensible improvement is our measurement discipline,
not a claim that this repository beats a published benchmark. External results
are context for choosing a test design; they are not interchangeable scores.

**Why it is better.** The public evidence spans incompatible tasks and quality
levels: an independent review reports pooled per-meal energy MAPE around
`<!-- NUMBER: pending measurement refresh -->`, a controlled-kitchen app study
reports roughly `<!-- NUMBER: pending measurement refresh -->` calorie
underestimation, and vendor-adjacent benchmark pages claim roughly
`<!-- NUMBER: pending measurement refresh -->`.
Presenting that spread honestly is a reason to measure the same inputs, labels,
coverage rule, and worst-cuisine headline here.

**How it is measured.** The pending external figure is from the [independent
systematic review](https://www.dietaryassessmentinitiative.org/publications/image-based-systematic-review-2025/).
The pending result is from an [American Society for Nutrition study release](https://www.eurekalert.org/news-releases/1136415),
which explicitly says the abstract has not generally undergone journal peer
review. The pending range is a [vendor-adjacent benchmark claim](https://www.clinicalnutritionreport.com/research/ai-photo-calorie-benchmark-2026/),
not peer-reviewed evidence, so it is not a target or baseline for mealog. Our
current V3 replay is the repository's own pending worst-cuisine MAPE at pending
coverage on a pending sample count, with the small label-tier boundary
documented in `docs/evaluation.md`.

**Example.** `pkg_0001` demonstrates why a headline without a portion audit is
misleading: the same identity moved from a historical APE to a pending APE
after the product's printed serving was sourced. That is a repository
measurement, not evidence that the external pending figures apply to this
system.
