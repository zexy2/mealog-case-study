# Video walkthrough script

Target runtime: **eight minutes and fifty seconds**, inside the brief's five-to-
ten-minute window.

This is a recording script, not an accuracy claim. Every result value below is a
marked placeholder. Replace a placeholder only after the input, label tier,
baseline commit, and run command are frozen in the repository. Never read a
seeded, remembered, or projected value aloud.

## Brief-question map

| Brief question | Answer moment | Core answer |
|---|---|---|
| Biggest trade-off | Shot S08, `05:30` | Closed-set abstention and user correction trade coverage and friction for fewer confident wrong answers. |
| Top three next accuracy improvements | Shot S09, `06:15` | Better mass evidence, calibrated portion uncertainty, and stronger per-cuisine identity retrieval. |
| What breaks at scale | Shot S10, `07:10` | In-memory idempotency, synchronous provider calls, retry amplification, and photo-memory/concurrency limits. |
| Security and privacy | Shot S11, `07:55` | Application-side photo retention is bounded, but demo identity, provider retention, and durable production controls remain explicit boundaries. |

## Recording rules

- Use Expo demo mode for the happy path. Type `quick simit` for an auto-accepted
  demo result and `ask baked beans` for the deliberate abstention. These are
  scripted fixtures, not model-quality evidence.
- Do not record an API key, a real person's photo, a personal identifier, or a
  provider response envelope. If a live-provider shot is added later, record it
  separately and redact secrets before editing.
- Keep the terminal on commands and architecture, not on unquotable scorecard
  rows. Show the metric labels with placeholders:
  `[METRIC: worst-cuisine kcal MAPE]`, `[METRIC: coverage]`,
  `[METRIC: Item F1]`, `[METRIC: false-positive rate]`.
- Before final export, replace placeholders only with values traceable to
  `[COMMIT: frozen baseline]`, `[RUN: reproducible command]`,
  `[LABEL TIER: source-backed tier]`, and `[CI: linked result]`.

## Shot-by-shot run of show

### S01 — The promise and the boundary (`00:00–00:30`)

**Picture:** Face-cam or title card, then the repository name and the three
mobile screens in a quick, quiet montage.

**Say:**

> Mealog turns a photo or a short description into catalogue foods, a portion
> distribution, and nutrition. The important design choice is what it refuses
> to fake: the model observes food; retrieval chooses from a closed set; one
> pure nutrition stage does the arithmetic. This walkthrough shows the working
> path, the deliberate failure, and the boundaries I would not call production
> complete yet.

**On-screen proof:** `STATUS.md`, then the mobile app. Do not show a scorecard
number in this shot.

### S02 — Cold start and honest setup (`00:30–01:10`)

**Picture:** Terminal. Run the documented fixture/demo setup, then open Expo Go
on the device or simulator. Keep the command readable; hide the home directory
and any environment values.

**Say:**

> The reviewer can start without a provider key. The offline evaluation and the
> mobile demo use recorded or deterministic inputs. That makes the walkthrough
> repeatable, but it does not make a fixture a live-provider accuracy result.
> The final evidence anchor will be `[COMMIT: frozen baseline]`, with
> `[METRIC: current evidence summary]` filled only after the run is quotable.

**On-screen proof:** the clean start command, `VISION_PROVIDER=fixture` or the
demo-mode setting, and the app opening. Do not display `.env` contents.

### S03 — Capture: photo and text share one contract (`01:10–02:10`)

**Picture:** Mobile `Capture` screen. Show camera permission state, the photo
frame, then the text field. Type `quick simit` and submit.

**Say:**

> Photo and text enter through the same capture boundary. The mobile client
> creates an idempotency key before submission and keeps a pending capture if
> the request fails. I am using text here because this is a deterministic demo;
> the photo path is the same product boundary with multipart validation on the
> API.

**On-screen proof:** `apps/mobile/App.tsx`, then `apps/mobile/src/api.ts` if a
cutaway is useful. Show the transition into the analysis state, not a provider
key or raw image bytes.

### S04 — Review is a trust boundary (`02:10–03:00`)

**Picture:** `Review` screen. Expand one item, show candidate alternatives,
the confidence/action banner, and the portion control. Save, then show `Day`.

**Say:**

> A catalogue match is visible and editable. The user can correct the food or
> portion before it lands in the day view. This is where the system keeps a
> model suggestion from becoming an invisible nutrition fact. The pipeline
> computes nutrients from the selected catalogue food and portion; the model
> does not get to write a calorie number.

**On-screen proof:** candidate food IDs, the editable review state, then the
`Day` screen. If the UI displays a value, describe it as demo data, not as a
measured metric.

### S05 — Deliberate failure: abstain instead of invent (`03:00–03:50`)

**Picture:** Return to `Capture`. Type `ask baked beans` and submit. Pause on
the review/question state. Do not edit the result into a happy path.

**Say:**

> This is the failure case I want to show. The system does not have enough
> confidence to commit this description to a canonical food, so it returns
> `ABSTAIN` and asks, “Is this kuru fasulye, or another bean dish?” That adds a
> user step and reduces immediate coverage. It is still preferable to inventing
> a food ID and presenting made-up nutrition as certain. I will not turn this
> one scripted demo into an accuracy percentage.

**On-screen proof:** `food_id: ABSTAIN`, the question, and the candidate list.
Label this shot **deliberate failure / correct abstention** in the edit.

### S06 — What the system actually computes (`03:50–04:45`)

**Picture:** Architecture diagram or a slow terminal scroll through the stage
names:

```text
input -> perception -> normalize -> retrieval -> resolve -> portion -> nutrition -> gate
```

**Say:**

> Perception returns observed items only. Locale data normalizes language and
> units. Retrieval proposes catalogue candidates, resolution chooses a closed
> food ID or abstains, portion returns a median and uncertainty band, and only
> `pipeline/nutrition.py` produces nutrient numbers. The gate decides whether
> to auto-accept, review, or ask. This separation is the anti-hallucination
> guarantee, not a prompt instruction.

**On-screen proof:** `README.md` architecture, `server/src/mealog/pipeline/runner.py`,
and `server/src/mealog/pipeline/nutrition.py`. Avoid showing unrelated logs or
unredacted request payloads.

### S07 — Measurement: show method before result (`04:45–05:30`)

**Picture:** Evaluation command and scorecard headings. If the scorecard is
not yet frozen for the submission, leave the values covered by placeholder
cards.

**Say:**

> The evaluation is stratified by cuisine and reads error beside coverage. The
> headline is `[METRIC: worst-cuisine kcal MAPE]`, followed by
> `[METRIC: worst-to-best spread]`; secondary context includes
> `[METRIC: covered mean MAPE]`, `[METRIC: coverage]`, and
> `[METRIC: Item F1]`. The result is only quotable with its sample count,
> label tiers, fixture provenance, baseline commit, and reproducible command.
> Until those fields are frozen, this video shows the method, not a number.

**On-screen proof:** `docs/evaluation.md`, the harness command, and
`[RUN: scorecard command]`. Do not read any value from memory.

### S08 — Brief question: biggest trade-off (`05:30–06:15`)

**Picture:** Split screen: the deliberate `ABSTAIN` question beside the review
screen's correction controls.

**Say:**

> My biggest trade-off is selective honesty versus friction. A system that must
> answer every plate can hide identity and portion errors behind a precise-looking
> total. This system accepts lower apparent coverage and an occasional question
> so uncertainty remains visible and the user can correct the decision. The
> cost is real: `[METRIC: coverage]` may move when the gate changes, and a user
> may leave before correcting a meal. The decision is intentional, and the
> scorecard must show both sides rather than optimize one number.

**Question label:** Add a visible lower-third: **Biggest trade-off — coverage
versus trustworthy abstention.**

### S09 — Brief question: top three next accuracy improvements (`06:15–07:10`)

**Picture:** A three-row priority card. No projected gains.

**Say:**

> My next accuracy work is ranked by evidence, not by model novelty.

> First, grow the source-backed golden set across cuisines and add defensible
> mass evidence, so identity and portion are not mixed into one vague label.
> Exit evidence: `[METRIC: per-cuisine result by label tier]` against
> `[COMMIT: frozen baseline]`.
>
> Second, make portion uncertainty more food-specific and calibrated: use the
> sourced density path, improve mass intervals, and ship the confidence gate
> only after it demonstrates selective risk reduction on real fixtures. Exit
> evidence: `[METRIC: risk-coverage comparison]` with density ignorance
> separated from identity uncertainty.
>
> Third, improve per-cuisine identity recall through alias coverage and a held-out
> visual retrieval adapter, while keeping the closed-set resolver and abstention
> boundary. Exit evidence: `[METRIC: per-cuisine identity precision/recall/F1]`
> and `[METRIC: abstention rate]`, not a single aggregate.

**Question label:** Add a visible lower-third: **Top three next accuracy
improvements — labels, portion calibration, identity retrieval.**

### S10 — Brief question: what breaks at scale (`07:10–07:55`)

**Picture:** Architecture cutaway. Highlight API cache, provider call, image
boundary, and logs in sequence.

**Say:**

> The first scale break is the in-memory idempotency cache. It is honest for a
> demo, but replicas need a durable store and a unique key over user identity
> and idempotency key. The next break is synchronous provider work: retries and
> fallback can multiply provider calls, so quota, latency, backpressure, and
> circuit breaking become operational requirements. Concurrent photo uploads
> also multiply memory use even when each request has a hard byte cap. Finally,
> structured logs need redaction, sampling, and a durable trace path before
> they become a useful fleet signal.

**On-screen proof:** `server/src/mealog/api/main.py` cache boundary, the mobile
retry path, and the Gemini adapter's bounded ladder. Label the durable database,
queue, circuit breaker, and object-storage path as **next architecture work**,
not shipped features.

### S11 — Brief question: security and privacy (`07:55–08:35`)

**Picture:** Security/privacy checklist over the capture screen and API boundary.

**Say:**

> The application-side privacy boundary is deliberate. The API validates image
> type and size, holds bytes for the provider call, and does not record the
> photograph or raw provider envelope in a fixture. Fixture lookup uses a
> content hash. The provider key stays server-side and is never bundled into
> the mobile app or shown in this recording.

> I am also explicit about what is not solved. The demo `X-User-Id` fallback is
> an identity convenience, not authentication. The in-memory replay cache is
> not a production retention or deletion system. Provider-side retention,
> access controls, consent, and deletion depend on the provider and deployment
> policy; this repository does not claim to control them. Those gaps belong in
> the security review before real personal photos are enabled.

**On-screen proof:** allow-list and byte-cap validation, server-side key
configuration, the absence of image files in recorded fixtures, and the
`X-User-Id` demo-default comment. Do not show secret values or a real image.

### S12 — Close with evidence boundary (`08:35–08:50`)

**Picture:** Return to the day view, then end on the repository's evidence links.

**Say:**

> The product path is small and demoable: capture, inspect, correct, and save.
> Its credibility comes from the boundaries: closed-set resolution, visible
> abstention, reproducible evaluation, and explicit scale and privacy gaps.
> Final result references are `[PR: walkthrough evidence]`,
> `[COMMIT: frozen baseline]`, `[CI: linked result]`, and
> `[METRIC: final quotable scorecard]`. If any one is missing, I will say that
> plainly instead of filling the gap with a clean-looking number.

## Final edit checklist

- [ ] Run through all shots once with a clean demo state.
- [ ] Confirm no API key, personal photo, user identifier, or raw provider
      payload appears in screen recording, terminal, or narration.
- [ ] Mark the deliberate abstention shot in the timeline; do not cut it as an
      “error” during editing.
- [ ] Replace only approved `[METRIC: ...]` placeholders, each with its source
      commit, command, label tier, and CI/eval evidence.
- [ ] Rehearse the four brief questions from S08–S11 without adding unsupported
      performance, readiness, scale, or privacy claims.
