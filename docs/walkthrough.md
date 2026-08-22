# Video walkthrough script

Target runtime: **8:00**. This is a recording script, not a result. Record it
after code freeze, and re-check every scorecard value against current `main` and
its evidence anchor immediately before recording.

## Run of show

| Time | Content | Evidence / fallback |
|---|---|---|
| 0:00–0:40 | Problem, scope, assumptions | Repository landing page and brief |
| 0:40–2:20 | Mobile photo flow: capture or choose, analysing, review, portion range, audit panel | Expo device capture; deterministic demo clip if the device path is unavailable |
| 2:20–2:50 | Live abstention: a catalogue miss becomes `ABSTAIN` | Abstention screen with observed item and candidates |
| 2:50–4:00 | Architecture and data flow | One diagram, then two boundaries only |
| 4:00–5:20 | Key decisions | Closed-set numbers, and worst-cuisine over mean |
| 5:20–6:15 | Evaluation harness and regression guard | Current n=80 scorecard and CI result |
| 6:15–6:50 | Security and privacy | Request boundary, key handling, what happens to a photograph |
| 6:50–7:30 | Limitations and measurable sample sizes | `STATUS.md` and the golden manifest |
| 7:30–8:00 | Next improvements, in priority order | Prioritised closing card |

Every spoken metric must include its sample size in the same sentence. Never
read a seeded, remembered, historical or projected number aloud.

## What is safe to say out loud

Verified against the working tree on the recording commit. Re-check each one
immediately before recording; if a check disagrees, do not say the number.

| Claim | Source |
|---|---|
| 3 locale packs | `locale_packs/`, `STATUS.md` |
| 99 canonical foods | `STATUS.md` |
| 80 golden samples | `eval/golden/manifest.jsonl`, `STATUS.md` |
| 80 recorded fixtures | `eval/fixtures/` |
| V3: 15% coverage, 12/80 committed, 68/80 ask | `docs/evaluation.md` |
| V3: 12.7% calorie MAPE over 2/2 eligible/scored rows; Item F1 0.15; FP 86.0% | `docs/evaluation.md` |

The V3 scorecard is safe to speak only with its denominator: **n=80** overall,
**12/80** committed, **68/80** ask, and calorie MAPE over **n=2** complete,
positive-truth rows. **72/80** manifest rows have partial truth; seven are covered
but excluded from calorie MAPE. Do not present partial-truth rows as zero calories.

## Recording rules

- The backend on screen is the Node/TypeScript port: `server/src/main.ts`, the
  Nest application module, and the framework-free domain and pipeline modules.
  Do not show a Python API terminal.
- **No folder-by-folder code tour.** Enter a file only to prove one boundary,
  and only briefly. This is the most common way a walkthrough of this length
  goes wrong.
- Do not record an API key, a real person's photograph, a personal identifier,
  or a raw provider response envelope. Keep the terminal on commands and the
  device on product state.
- Backend rehearsal commands, from `server/`:

  ```text
  npm ci
  npm run build
  npm run lint
  npm test
  ```

- Device rehearsal commands, from `apps/mobile/`:

  ```text
  npm ci
  npm run verify
  npm start
  ```

- Demo order is deliberate: a meal the system handles well, then the portion
  range and the audit panel, then the abstention. Leading with the failure
  reads as a lack of confidence; hiding it reads as a lack of honesty.
- The fallback recording is the deterministic Expo demo path. It shows the
  interaction and the abstention state honestly, but it is not live-provider
  evidence. If the device path is unavailable, use the clip and label it
  **fixture / demo path** in the edit.
- For live evidence, set `EXPO_PUBLIC_DEMO_MODE=false` and point the app at the
  configured Node endpoint. Do not call a runtime smoke a deployment or a gate
  until the corresponding claim is closed and its acceptance criteria are met.

## Script

### 0:00–0:40 — The problem, the scope, the assumptions

**Picture:** Title card, then the three mobile screens side by side.

**Say:**

> A meal photograph is an uncertain observation, but a nutrition log has to be
> a decision someone can inspect. Mealog narrows that to three things: a
> catalogue food, an explicit portion range, and nutrition computed from the
> food that was chosen. The scope is deliberately small — capture, inspect,
> correct, save.
>
> Where the brief was silent I made three assumptions, and I will show the cost
> of each. Evidence is recorded and replayed offline, so the numbers reproduce
> without a key. A market is data rather than code, so adding one does not mean
> editing the pipeline. And when the catalogue cannot account for a food, the
> system abstains instead of guessing.

**On-screen proof:** the repository landing page, the brief, `STATUS.md`. Show
no scorecard value in this opening.

### 0:40–2:20 — The mobile photo flow

**Picture:** Expo app on a device. `Capture` with the live camera, the library
button, the analysing state, then `Review` with the portion range and the audit
panel open.

**Say:**

> I start with no provider key set. Capture offers the live camera or an
> existing photograph from the library — the same boundary accepts both, and it
> also accepts text, which is what makes a deterministic rehearsal possible.
>
> While it works, the app names what it is doing rather than showing a
> featureless spinner: reading the image, matching against the catalogue, then
> estimating the portion. Those are the three real stages, in order, so the
> wait itself tells the user how the answer is being built.
>
> Review is where the decision becomes inspectable. The food is a catalogue
> entry, not free text. The portion is a range — about so many grams, with a
> likely minimum and an upper bound — and the slider is bounded by that range,
> so correcting the estimate cannot push it somewhere the evidence does not
> support. A point estimate here would be a false certainty; mass error
> dominates calorie error, so the width is the honest part.
>
> Then the part I would want to see as a reviewer: **Why this result?** It
> traces the decision — the matched `food_id`, the source database the numbers
> came from, the confidence, the exact grams used, and the alternates that were
> considered and not chosen. Nothing in that panel is a model opinion. Every
> row is either catalogue provenance or an arithmetic input.

The repository also records a live-provider iOS Simulator/Expo Go gallery smoke
in claim [#187](https://github.com/zexy2/mealog-case-study/issues/187): twelve
gallery images plus one repeat, real Photos picker input, provider health
`vision=gemini`, rice resolving to `tr.pilav`, simit plus ayran preserved as two
items with item-level ranges, and deterministic repeat output. Karniyarik,
bulgur, iced coffee, and a non-food input abstained. Lahmacun exposed a
conservative false reject: an exact candidate was visible but the action stayed
`ABSTAIN`. No degraded/retry state appeared.

This is runtime smoke evidence only. It is not a hosted deployment proof, a
physical-device claim, or the live multi-item acceptance gate; do not claim that
gate until Codex5's retest completes. Do not count the discarded old-bundle
result, and do not call catalogue defaults visually measured.

**On-screen proof:** the capture screen with both input affordances, the
analysing steps, the review screen, the portion range, and the expanded audit
panel. Do not show an API response envelope.

### 2:20–2:50 — A catalogue miss, live

**Picture:** Same app. Submit a food the catalogue does not carry, and stop on
the abstention screen with the observed item and the candidate list visible.

**Say:**

> Here the food is outside the catalogue, or close enough to a documented
> confusion that the resolver will not commit to it. The result is `ABSTAIN`.
> The user sees what was observed, the candidates that caused the hesitation,
> and a question — not an invented food and not invented nutrition.
>
> This costs a tap and it costs coverage. I am showing it on purpose. A system
> that quietly picks the nearest neighbour looks better in a demo and is worse
> in a kitchen, because the user cannot see that it guessed.

**On-screen proof:** the abstention screen — the `ABSTAIN` state, the observed
item, and the candidate list. Label the shot **deliberate failure / correct
abstention**.

### 2:50–4:00 — Architecture and data flow

**Picture:** One diagram. Then two files, briefly, and nothing else.

```text
Expo capture (camera or library)
    -> POST /v1/meals
    -> NestJS edge  (server/src/main.ts, app module)
    -> framework-free domain + pipeline
         normalize -> retrieval -> resolve -> portion -> nutrition
    -> vision port  (fixture replay | live provider)
    -> review / abstain / save in the app
```

**Say:**

> The edge is NestJS and it is thin — controllers and providers. Everything
> below it is plain TypeScript with no framework imports at all, which is what
> lets the evaluation harness drive the exact modules the API serves without
> booting a web server. That boundary is enforced in CI rather than described
> in a README; a framework import in the pure directories fails the build.
>
> The provider sits behind a port. Offline, a recorded response is replayed and
> found by the hash of the image bytes, so the same photograph resolves to the
> same recorded answer on any machine. That is what makes the numbers
> reproducible without a key.
>
> One line matters more than the rest: only the nutrition stage produces a
> nutrient number. I will come back to why in a moment.

The `POST /v1/meals` edge is implemented in `server/src/app/meals.controller.ts`
and `meals.service.ts`. The Node/Nest edge validates JSON or multipart image
input, applies request-level idempotency, and delegates to the framework-free
pipeline. The local endpoint is the supported reproducible boundary; no hosted
URL is claimed. The Python harness remains the offline evaluator, not the mobile
API.

**On-screen proof:** the diagram, then `server/src/pipeline/ports.ts` for the
provider boundary and the CI invariant that keeps framework imports out of the
pure directories. Two files. Do not tour the tree.

### 4:00–5:20 — Two decisions

**Picture:** Split screen — the audit panel on one side, the evaluation method
card on the other.

**Say:**

> The first decision came out of a failure I caught early. The first version
> let the vision response carry a calorie number. It was plausible and it was
> unauditable: there was no catalogue food and no measured portion to check it
> against. So the contract changed. The model observes items. Resolution picks
> an identifier from a closed set or abstains. Nutrition computes the number
> from catalogue data. **The model is never given a field in which to put a
> calorie**, and the adapter now rejects a provider response that tries — it
> fails the request rather than quietly dropping the field, because a provider
> that started guessing nutrition is something I want to hear about.
>
> That is why the audit panel can exist at all. Every number on it has a source
> that is not the model.
>
> The second decision is how accuracy is read. A mean hides the cuisine that is
> failing, and this product's whole risk is a cuisine it has not seen. So the
> headline is the worst cuisine bucket, with coverage next to it, because a
> system that answers fewer meals is not comparable to one that answers all of
> them. Abstentions are not scored as zero-calorie answers — doing that once
> inverted a result and is the reason the harness was built before the model.

Current offline V3 on **n=80** commits **12/80 (15%)**, asks **68/80**, and has
Item F1 **0.15** with FP rate **86.0%**. Worst/mean calorie MAPE is **12.7%**
over **2/2** complete-positive rows. The other 72 partial-truth rows are outside
the calorie denominator; this is not a live-provider accuracy result.

**On-screen proof:** D1 and D3 in `docs/decisions.md`, the closed-set resolver,
and the adapter check that rejects a nutrition field at the provider boundary.

### 5:20–6:15 — The evaluation harness and the regression guard

**Picture:** The evaluation method in the repository, then the green CI checks.

**Say:**

> The harness replays recorded provider responses offline — no key, no network,
> no spend. It splits results by cuisine, reports coverage beside error, and
> keeps label tiers visible, because an error against a weaker label is weaker
> evidence.
>
> The regression guard is the part I would look at first. It compares a
> candidate run against a stored baseline and fails if **any** cuisine bucket
> gets worse. A green aggregate is not sufficient to merge.

When speaking the table, name the metric and its denominator in the same sentence.
The regression guard still compares the selected configuration against the stored
baseline per cuisine; a green aggregate is not sufficient to merge. Empty calorie
buckets are shown as unavailable, not as zero error.

**On-screen proof:** the harness, the regression check, and the CI run. A
browser view of CI is the fallback if the local rehearsal cannot be shown.

### 6:15–6:50 — Security and privacy

**Picture:** The request-boundary contract, then the secret-guard CI result.

**Say:**

> A food photograph is health-adjacent data going to a third party, so the
> boundary is explicit. The request validates image type and size. The bytes
> are held only for the provider call — the application does not persist the
> photograph, and a recorded fixture stores validated observations only, never
> the image and never the raw response envelope.
>
> The provider key stays server-side and is read from configuration; it is
> never in the repository, and CI scans both the tree and the diff on every
> pull request. Idempotency is user-scoped, so one caller's replay cannot be
> handed to another.

The Node/TypeScript request validator ships with the meal endpoint. The current
edge keeps image bytes in memory for the provider call and does not persist the
photo or raw provider envelope. The Gemini key stays server-side. The process-local
idempotency cache is user-scoped by an optional `X-User-Id` header, defaulting to
`demo-user`; that is namespacing, not auth. Health is liveness only, and the
adapter's event hook is not a durable request-observability system. The #187 smoke
did not encounter a degraded/retry state, so do not narrate one as tested.

**On-screen proof:** the D5 contract, the configuration boundary, the CI
secret-guard result, and a recorded fixture with no image bytes in it. Never
show a key, a personal photograph, or a user identifier.

### 6:50–7:30 — Limitations, and how much is actually measurable

**Picture:** `STATUS.md`, then the golden manifest and the fixture directory.

**Say:**

> Three limits, said plainly.
>
> First, runtime proof. Claim #187 records an iOS Simulator/Expo Go live-provider
> smoke, but it does not prove a physical-device run, a hosted deployment, or the
> pending Codex5 live multi-item gate. Treat those boundaries as explicit.
>
> Second, catalogue coverage. There are 99 canonical foods across three locale
> packs. A food outside them cannot be logged — only abstained on. That is a
> real ceiling on recall, and it is the direct cost of refusing to let the
> model invent an identifier.
>
> Third, and the one most easily oversold: the golden set has 80 samples with
> 80 recorded fixtures, but **not every sample can be scored for calories**.
> Some carry identity truth only, with no trustworthy mass, and a sample
> without measured mass cannot support a calorie claim. So the number of rows
> behind an accuracy figure is smaller than the number of samples, and any
> figure I quote has to name that smaller number rather than the headline
> count.

The exact current calorie denominator is **2 eligible and 2 scored rows** out of
**n=80**. Quote that denominator with the **12.7%** MAPE; do not turn the 72
partial-truth rows into zero-calorie errors.

**On-screen proof:** `STATUS.md`, `eval/golden/manifest.jsonl`, and the fixture
directory. Show the current denominator beside the scorecard, not a synthetic
zero for partial truth.

### 7:30–8:00 — What I would do next

**Picture:** Closing card with three priorities, then the abstention screen.

**Say:**

> Three things, in this order. Complete Codex5's live multi-item retest and record
> its exact boundary. Then record the Loom from current `main`, labelling fixture /
> demo states separately from the #187 live-provider smoke and quoting every metric
> with its denominator. Finally send the email with the repository link, local
> commands, current n=80 scorecard, partial-truth denominator, and known
> in-memory idempotency, unauthenticated user header, observability, and privacy
> limits. Do not add a deployment URL or EatBetter internals without public proof.
>
> The order is deliberate: the acceptance evidence first, then the recording and
> email. The product is small on purpose, but every boundary is visible —
> capture, correction, abstention, reproducible measurement, and an explicit
> privacy limit.

**On-screen proof:** the CI result, the Codex5 retest handoff, the current scorecard
denominators, and the abstention screen as the last thing on screen.

## Final edit checklist

- [ ] Rehearse the full run once from a clean checkout after code freeze.
- [ ] Re-verify every number in **What is safe to say out loud** against the
      recording commit. If a source disagrees, cut the number.
- [ ] Confirm the backend on screen is Node/TypeScript; no Python API terminal.
- [ ] Confirm the abstention shot is in the final cut and labelled a deliberate
      failure / correct abstention.
- [ ] Confirm the audit panel is shown expanded, with `food_id`, source, and
      alternates legible.
- [ ] Confirm every spoken metric carries its sample size in the same sentence,
      and that scorable counts are used where a calorie claim is made.
- [ ] Do not remove the live multi-item caveat until Codex5's retest is complete
      and its evidence is reviewed.
- [ ] Confirm no API key, personal photograph, user identifier, or raw provider
      payload appears in the recording, the terminal, or the narration.
- [ ] Confirm the runtime is at or under 8:00.
