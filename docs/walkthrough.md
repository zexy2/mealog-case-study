# Video walkthrough script

Target runtime: **8:00**. This is a recording script, not a result. Record it
after code freeze, and keep every scorecard value behind its evidence anchor
until the refreshed run is committed.

## Run of show

| Time | Content | Evidence / fallback |
|---|---|---|
| 0:00–0:40 | Problem, scope, assumptions | Repository landing page and brief |
| 0:40–2:20 | Device flow: photo, food, portion range, nutrition | Expo device capture; demo recording if the ported backend is pending |
| 2:20–2:50 | Live abstention outside the catalogue | `ABSTAIN` question state; deterministic fixture fallback |
| 2:50–4:00 | Architecture and data flow | One diagram, then the Node/TypeScript entrypoints |
| 4:00–5:20 | Two decisions | Closed-set numbers and worst-cuisine measurement |
| 5:20–6:15 | Evaluation harness and regression guard | Scorecard method and CI result, with refreshed values pending |
| 6:15–6:50 | Security and privacy | Request boundary and secret guard |
| 6:50–7:30 | Limitations and scorable evidence | `STATUS.md` and the current manifest |
| 7:30–8:00 | Next work | Prioritised closing card |

Every spoken metric must include its sample size in the same sentence. Never
read a seeded, remembered, historical, or projected number aloud. Do not call
the submission complete while the pending evidence remains.

## Recording rules

- The backend shown on screen is the Node/TypeScript port: `server/src/main.ts`,
  the Nest application module, and the framework-free domain/pipeline ports.
  Do not show a Python API terminal. The ported meal endpoint and the mobile
  connection are not yet on the rehearsal commit, so the affected shots are
  explicitly marked `<!-- PENDING -->` below.
- Do not record an API key, a real person's photo, a personal identifier, or a
  raw provider response envelope. Keep the terminal on commands and the device
  on the product state.
- For a clean backend rehearsal, show the commands from `server/`:

  ```text
  npm ci
  npm run build
  npm run lint
  npm run test
  ```

  For the device rehearsal, show the commands from `apps/mobile/`:

  ```text
  npm ci
  npm run verify
  npm start
  ```

- The fallback recording is the Expo fixture/demo path: it is useful for showing
  the interaction and the abstention state, but it is not live-provider
  evidence. If the device or ported endpoint is unavailable, show the recorded
  device clip and label it **fixture/demo path** in the edit.

## Script

### 0:00–0:40 — The problem and the boundary

**Picture:** Title card, repository name, then the three mobile screens.

**Say:**

> A meal photo is an uncertain observation, but a nutrition log needs an
> inspectable decision. Mealog narrows that problem to catalogue foods, an
> explicit portion range, and nutrition computed from the selected food. The
> scope is deliberately small: capture, inspect, correct, and save. Where the
> brief was silent, I chose recorded offline evidence, locale packs as data,
> and abstention instead of a confident guess.

**On-screen proof:** the repository landing page, the brief, and `STATUS.md`.
Do not show a scorecard value in this opening.

### 0:40–2:20 — The device flow

**Picture:** Expo app on a device. Start on `Capture`, take a plate photo, show
the analysis state, then open `Review` and `Day`.

**Say:**

> I start without a provider key. The app can run its deterministic demo path,
> and the backend checks can run from a clean Node installation. I capture a
> meal, inspect the proposed catalogue food, see the portion as a range rather
> than a false point of certainty, and save the nutrition result only after the
> review state. The same capture boundary accepts text for a deterministic
> rehearsal; a photo is the intended input.

> The app creates an idempotency key before submitting and retains a pending
> capture when a request fails. That makes retry behavior visible without
> recording a provider key or a photograph in the repository.

<!-- PENDING -->

The mobile client against the ported Node/TypeScript meal endpoint is not yet on
the rehearsal commit. Record this beat against that endpoint after the port
lands; until then, use the Expo fixture/demo clip and label it as such.

**On-screen proof:** `apps/mobile/App.tsx` for capture, pending, retry, and
review transitions; `apps/mobile/src/api.ts` for the two request shapes; then
the device screens. Do not show an API response envelope.

### 2:20–2:50 — Abstention, live on the device

**Picture:** In the same app, submit `baked beans` and pause on the question
state. Keep the `ABSTAIN` item and candidate list visible.

**Say:**

> Here the food is outside the catalogue, or close enough to a known confusion
> that the resolver will not commit it. The result is `ABSTAIN`: the user sees
> a question and the candidates that caused it, rather than a made-up food ID
> and made-up nutrition. This costs a step and some coverage. It is the failure
> mode I want the reviewer to see, not an error to cut from the video.

<!-- PENDING -->

Replay this against the ported backend once the endpoint is on the device path.
The current deterministic Expo branch is the fallback recording, not a claim
about provider accuracy.

**On-screen proof:** `food_id: ABSTAIN`, the question, and the candidate list.
Label the shot **deliberate failure / correct abstention**.

### 2:50–4:00 — Architecture and data flow

**Picture:** One diagram, then only the Node/TypeScript files that support it.

```text
Expo capture
    -> POST /v1/meals
    -> NestJS edge (`server/src/main.ts`)
    -> app module / ports
    -> framework-free domain and pipeline
    -> locale catalogue + portion
    -> pure nutrition
    -> review / abstain / save in the app
```

<!-- PENDING -->

The ported meal route and the end-to-end mobile connection are not present on
the rehearsal commit yet. Keep the diagram, but render that edge as a pending
implementation beat until it is real.

**Say:**

> The edge starts in the Nest bootstrap and hands work to framework-free
> modules. The domain owns the contract, the ports keep provider and transport
> details at the boundary, retrieval proposes catalogue candidates, and
> resolution returns a catalogue ID or `ABSTAIN`. Portion keeps an uncertainty
> band. Only the nutrition stage is allowed to produce nutrient numbers. The
> diagram is the whole story; I am entering a file only to prove one boundary,
> not taking a folder-by-folder tour.

**On-screen proof:** `server/src/main.ts`, the app module, the domain models,
and `server/src/pipeline/ports.ts` from the Node/TypeScript port. Show the CI
architecture invariant that keeps Nest imports out of the pure directories.

### 4:00–5:20 — Two decisions that make the result trustworthy

**Picture:** Split screen: the `ABSTAIN` state and the evaluation method card.

**Say:**

> The first decision came from a caught failure. The early baseline let the
> vision response carry a calorie number. We could not audit that guess against
> a catalogue food and a measured portion, so the contract was changed: the
> model observes items, resolution chooses from a closed set or abstains, and
> nutrition computes the number from trusted catalogue data. The model no
> longer gets a field in which to hide a calorie hallucination.

> The second decision is how I read accuracy. A mean can hide the cuisine that
> is failing, so the headline is the worst cuisine bucket, with coverage beside
> it. The committed manifest currently has n=9 samples; the refreshed scorecard
> is pending, and I will speak each result only with its own sample size and
> label tier.

<!-- PENDING -->

Replace the method card with refreshed scorecard values only after the input,
labels, baseline commit, and run command are frozen.

**On-screen proof:** D1 and D3 in `docs/decisions.md`, the closed-set resolver,
`pipeline/nutrition.py`, and the harness output schema. Do not show stale
historical values from `docs/evaluation.md`.

### 5:20–6:15 — Evaluation and the regression guard

**Picture:** Show the evaluation method in the repository and the green CI
checks in the browser. Keep result cells covered until the refresh is committed.

**Say:**

> The harness replays recorded provider responses offline. It separates cuisine
> buckets, reports coverage next to error, and keeps label tiers visible. The
> regression guard compares the candidate with the stored baseline and fails if
> any cuisine gets worse. That is what makes a green aggregate insufficient.

> The current number cells are deliberately pending measurement refresh. When
> they are filled, the sentence will name the metric, its sample size, the label
> tier, the baseline commit, and the exact command. Until then, this shot proves
> the method and the guard, not a new performance claim.

<!-- PENDING -->

Refresh the scorecard and record the final evidence anchors before reading any
result aloud. A browser view of CI is the fallback if the local rehearsal
cannot be shown.

**On-screen proof:** `docs/evaluation.md`, `eval/harness.py`, the regression
check, and the linked CI run. Do not run or show the old Python API server.

### 6:15–6:50 — Security and privacy

**Picture:** Request-boundary checklist, then the secret-guard CI result.

**Say:**

> Food photos are health-adjacent data sent to a third-party provider. The
> request contract validates the image type and size, holds bytes only for the
> provider call, and records neither the photograph nor the raw provider
> envelope in a fixture. The provider key stays server-side. User-scoped
> idempotency prevents one tenant's replay from being returned to another, and
> the tracked-secret guard scans both the tree and the diff.

<!-- PENDING -->

Show the Node/TypeScript request validator and the live device boundary after
the ported endpoint lands. Until then, show the contract and the CI guard
without implying that this rehearsal exercised a live provider.

**On-screen proof:** the D5 contract, the server-side configuration boundary,
the CI secret-guard result, and the absence of photos from recorded fixtures.
Never show a key, a personal photo, or a user identifier.

### 6:50–7:30 — Limitations and scorable evidence

**Picture:** `STATUS.md`, then the golden manifest and the fixture directory.

**Say:**

> This is a small evidence set, not a claim about every cuisine or every plate.
> The current manifest has n=9 golden samples, and the catalogue can only score
> foods it contains; everything else must abstain. The mobile-to-ported-backend
> path and the refreshed result cells are still pending. Those limits are part
> of the submission evidence, so I show them instead of smoothing them away.

**On-screen proof:** `STATUS.md`, `eval/golden/manifest.jsonl`, and the recorded
fixture mapping. Do not invent a coverage or accuracy percentage for a pending
run.

### 7:30–8:00 — What comes next

**Picture:** A closing card with three priorities, then the abstention screen.

**Say:**

> Next I would finish the ported meal endpoint and run the device path, refresh
> the scorecard on real labels, and then measure the scale curve before changing
> retrieval. The order protects the evidence: first the same contract end to
> end, then the numbers, then the cost of a larger catalogue. The product is
> small by design, but every boundary is visible: capture, correction,
> abstention, reproducible measurement, and an explicit privacy limit.

**On-screen proof:** the Node/TypeScript CI result, the pending markers to be
cleared by their owning work, and the final `ABSTAIN` screen.

## Final edit checklist

- [ ] Rehearse the full run once from a clean checkout after code freeze.
- [ ] Confirm the backend visible in the recording is Node/TypeScript; do not
      show a Python API terminal.
- [ ] Confirm the abstention shot remains in the final cut and is labelled as a
      deliberate failure / correct abstention.
- [ ] Confirm every spoken metric has its sample size in the same sentence.
- [ ] Replace `<!-- PENDING -->` beats only when the corresponding endpoint or
      scorecard evidence exists in the repository.
- [ ] Confirm no API key, personal photo, user identifier, or raw provider
      payload appears in the recording, terminal, or narration.
