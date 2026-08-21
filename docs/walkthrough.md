# Video walkthrough script

Target runtime: **8:00**. This is a recording script, not a result. Record it
after code freeze, and keep every scorecard value behind its evidence anchor
until the refreshed run is committed.

## Run of show

| Time | Content | Evidence / fallback |
|---|---|---|
| 0:00–0:40 | Problem, scope, assumptions | Repository landing page and brief |
| 0:40–2:20 | Mobile photo flow: capture or choose, analysing, review, portion range, audit panel | Expo device capture; deterministic demo clip if the device path is unavailable |
| 2:20–2:50 | Live abstention: a catalogue miss becomes `ABSTAIN` | Abstention screen with observed item and candidates |
| 2:50–4:00 | Architecture and data flow | One diagram, then two boundaries only |
| 4:00–5:20 | Key decisions | Closed-set numbers, and worst-cuisine over mean |
| 5:20–6:15 | Evaluation harness and regression guard | Method and CI result; result cells pending refresh |
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
| 69 canonical foods | `STATUS.md` |
| 80 golden samples | `eval/golden/manifest.jsonl`, `STATUS.md` |
| 80 recorded fixtures | `eval/fixtures/` |

**No accuracy, coverage or error figure is currently safe to speak.**
`docs/evaluation.md` still describes an earlier, smaller run than the manifest
now holds, so every result number in it is superseded until that document is
refreshed against the current golden set. Those beats stay `<!-- PENDING -->`.
Say "the refreshed scorecard is pending" rather than reading a stale figure.

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

<!-- PENDING -->

This beat is recorded against the deterministic Expo demo path. The mobile
client has not yet been shown running against the ported Node/TypeScript meal
endpoint — `server/src/app/` currently exposes the application module and the
health controller only. Re-record against the live endpoint once it lands, and
until then label the clip **fixture / demo path**.

<!-- PENDING -->

Running on a physical device is shown in this recording but is not provable
from the repository. Treat the device shot as demonstration, not as evidence.

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

<!-- PENDING -->

The `POST /v1/meals` edge is drawn as the intended contract. It is not yet
implemented in the TypeScript app layer; keep it in the diagram, and say
plainly that the endpoint is the next piece of work rather than implying it is
running.

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

<!-- PENDING -->

Do not put a scorecard figure on the method card until the refreshed run is
committed. Show the method and the shape of the table with the result cells
covered.

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

<!-- PENDING -->

The scorecard has not been regenerated against the current golden set, so no
result is spoken here. When it is refreshed, each sentence must name the
metric, its sample size, the label tier, the baseline commit, and the exact
command that produced it. Until then this segment proves the method and the
guard, not a performance claim.

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

<!-- PENDING -->

The Node/TypeScript request validator ships with the meal endpoint, which is
not yet implemented. Show the contract and the CI guard, and do not imply this
rehearsal exercised a live provider call.

**On-screen proof:** the D5 contract, the configuration boundary, the CI
secret-guard result, and a recorded fixture with no image bytes in it. Never
show a key, a personal photograph, or a user identifier.

### 6:50–7:30 — Limitations, and how much is actually measurable

**Picture:** `STATUS.md`, then the golden manifest and the fixture directory.

**Say:**

> Three limits, said plainly.
>
> First, device proof. You are watching this run on a phone, but the repository
> cannot prove that; it can prove the app typechecks and bundles. Treat the
> device footage as a demonstration and the CI result as the evidence.
>
> Second, catalogue coverage. There are 69 canonical foods across three locale
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

<!-- PENDING -->

Read the exact scorable count from the refreshed run before recording this
segment. Do not estimate it, and do not reuse the count from the earlier,
smaller manifest.

**On-screen proof:** `STATUS.md`, `eval/golden/manifest.jsonl`, and the fixture
directory. Do not invent a coverage or accuracy percentage for a pending run.

### 7:30–8:00 — What I would do next

**Picture:** Closing card with three priorities, then the abstention screen.

**Say:**

> Three things, in this order. Finish the meal endpoint so the same contract
> runs end to end from the device. Refresh the scorecard against the current
> golden set so the numbers describe what is actually in the repository. Then
> measure what a larger catalogue costs before changing retrieval — coverage is
> the binding limit, and I would rather measure that curve than guess at it.
>
> The order is deliberate: the contract first, then the measurement, then the
> change. The product is small on purpose, but every boundary is visible —
> capture, correction, abstention, reproducible measurement, and an explicit
> privacy limit.

**On-screen proof:** the CI result, the remaining `<!-- PENDING -->` markers
and who clears them, and the abstention screen as the last thing on screen.

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
- [ ] Replace a `<!-- PENDING -->` beat only when the corresponding endpoint,
      device evidence, or refreshed scorecard exists in the repository.
- [ ] Confirm no API key, personal photograph, user identifier, or raw provider
      payload appears in the recording, the terminal, or the narration.
- [ ] Confirm the runtime is at or under 8:00.
