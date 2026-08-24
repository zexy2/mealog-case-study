# mealog — Full Stack Developer take-home for EatBetter

mealog is a mobile-first meal logging case study: the model sees food, but never produces a calorie number.

<!-- PENDING: recorded walkthrough link, demo gif -->
<!-- PENDING: scorecard refresh — issue #218 changes the vision schema and re-records the golden fixtures, so every figure under Results will move -->
<!-- TODO(when available): Expo QR + deployed API URL -->

## Run it

Runtime versions are pinned by the project workflow: Python 3.11 for the offline research harness and Node.js 22 for the delivered TypeScript service and mobile app.

### Delivered Node.js service

The NestJS service defaults to the keyless fixture provider. From the repository root:

```sh
cd server
npm ci
npm run build
npm run lint
npm run test
npm start
```

In another terminal, liveness is available at `http://localhost:3000/health`.
`VISION_PROVIDER=gemini` selects the live Gemini adapter and requires
`GEMINI_API_KEY`; no live-provider accuracy claim is made here.

### Mobile app

```sh
cd apps/mobile
npm ci
npm run typecheck
npx expo export --platform ios
npx expo export --platform android
```

`npm run ios` launches the Expo iOS path when a local simulator is configured.
Current main proves typecheck and iOS/Android bundle exports. It does not record
an interactive iOS Simulator run or a live mobile-to-Node provider request.

The mobile client is deterministic demo mode unless
`EXPO_PUBLIC_DEMO_MODE=false` and `EXPO_PUBLIC_API_URL` are both supplied. Demo
mode uses local scenarios and no network. Live mode calls `POST /v1/meals`; it
requires a reachable local Node service and provider configuration. Multi-item
preservation through that live path remains unverified.

### Offline evaluation and reference tooling

This path is keyless. It replays repository fixtures from `eval/fixtures/`
against locale and golden-set data; no provider token or network call is
required.

```sh
MEALOG_VENV="$(mktemp -d)/venv"
python3.11 -m venv "$MEALOG_VENV"
. "$MEALOG_VENV/bin/activate"
python -m pip install -e "server[dev]"
make check
```

`make eval` runs the offline evaluation harness directly when a scorecard
refresh is needed. Python remains evaluation/reference tooling, not the
delivered HTTP API.

## What I built vs the brief

| Brief requirement | Status | Evidence or reason |
| --- | --- | --- |
| Mobile app, not a web app | Partial | Expo client has capture, review, and day screens; bundle exports are verified, interactive simulator/device execution is not. |
| Node.js / TypeScript backend | Delivered | NestJS edge, vision adapters, runner, retrieval seam, portion gate, and evaluator correction are merged; live-provider accuracy remains unverified. |
| Technical write-up | Partial | README, evaluation, comparison, and walkthrough documents exist; recorded video and hosted link are pending. |
| Walkthrough video | Partial | The [8:00 recording script](docs/walkthrough.md) is merged; recording and hosted link are pending. |
| Email summary | Deferred | Summary has not been drafted. |
| Explicit EatBetter comparison | Working (document) | The evidence-led comparison is merged in [docs/comparison.md](docs/comparison.md); it does not claim live-provider accuracy. |
| AI / LLM path | Partial | Model perception is separated from closed-set resolution and deterministic nutrition; live-provider accuracy is unverified. |

## Architecture

```text
photo or text
     |
perception -> normalize -> retrieve -> resolve -> portion -> nutrition -> gate
     |                                             |
  evidence                                   food_id or ABSTAIN
```

Perception may return observed food descriptions and uncertainty. Normalize
makes text comparable across spelling, diacritics, and locale. Retrieval
proposes catalogue candidates. Resolve accepts only a catalogue `food_id` or
`ABSTAIN`; it never emits free text. Portion estimates serving size while
retaining uncertainty. Nutrition is the only stage allowed to produce nutrient
numbers, using locale-pack data rather than model prose. The final gate decides
whether to save, ask for review, or abstain.

The delivered service is Node.js / TypeScript. NestJS owns the edge boundary;
pure core stages stay framework-independent so parity tests can compare ports
against the Python reference. The Python harness remains research tooling for
fixtures, golden labels, and offline evaluation. It is not presented as the
delivered API.

## Key decisions

| Decision | Rejected alternative | Constraint | Cost |
| --- | --- | --- | --- |
| [D1](docs/decisions.md#d1) — model never produces nutrition | Ask the model for calories directly | Only deterministic nutrition code may produce nutrient numbers | Catalogue misses become review or abstention cases |
| [D2](docs/decisions.md#d2) — locale data lives in packs | Add market-specific branches to pipeline code | Market variation must remain data, with pack licensing visible | Pack maintenance and legal review grow with markets |
| [D3](docs/decisions.md#d3) — report worst-case cuisine and coverage | Report only an overall mean | Distribution shift must stay visible to reviewers | Small buckets remain noisy and harder to summarize |
| [D9](docs/decisions.md#d9) — Expo React Native client with focused screens | Ship a web app or a different mobile stack | Reviewer path must be a real phone flow | Expo and native runtime constraints remain |
| [D12](docs/decisions.md#d12) — NestJS edge, TypeScript service, Python harness | Rewrite evaluation before parity or keep Python at the edge | Pure-core parity gates the port; Python stays research tooling | Two runtimes create temporary maintenance and release ceremony |

## Results

Current offline V3 replay from `docs/evaluation.md` covers all **80** committed
samples. Overall coverage is **15% (12/80)**, Item F1 is **0.15**, FP rate is
**86.0%**, and kcal MAPE is **12.7%**. MAPE is computed over **2/2**
calorie-eligible/scored rows; `eligible` means complete positive-truth rows and
`scored` means the covered subset. An em dash means an empty calorie denominator,
not zero-percent error.

| Cuisine | n | Coverage | Eligible/scored | Item F1 | kcal MAPE | FP rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| western | 12 | 42% | 2/2 | 0.41 | 12.7% | 69.2% |
| mediterranean | 12 | 33% | 0/0 | 0.19 | — | 78.9% |
| east_asian | 16 | 6% | 0/0 | 0.11 | — | 89.3% |
| other_mixed | 8 | 0% | 0/0 | 0.08 | — | 91.7% |
| south_asian | 16 | 0% | 0/0 | 0.00 | — | 100.0% |
| latin_american | 16 | 12% | 0/0 | 0.08 | — | 93.5% |
| **overall** | **80** | **15%** | **2/2** | **0.15** | **12.7%** | **86.0%** |

Measured repository inventory: **3 locale packs**, **99 canonical foods** (en_US 38, tr 53, ja_JP 8), and
**80 recorded golden-set fixtures**. These are offline evaluation facts, not
live-provider performance.



## Known failures, measured

Every failure below is reproduced, not suspected. Figures come from the offline
scorecard, a live verification run on `acfa6dd` (2026-08-23, 12 requests, all
HTTP 200), and a 21-request catalogue audit (2026-08-22). Verified behaviour is
recorded under Results and Testing; this section is deliberately only the
failures.

| Failure | Evidence | Effect | Tracked |
| --- | --- | --- | --- |
| A photographed count is trusted without being observed | `A2.jpg` shows two simits. The service returns one `tr.simit`, 100 g, **329 kcal**, against a 658 kcal ground truth. Identical across three independently keyed submissions. The same input as text (`2 simit`) returns 658 kcal correctly. | Roughly 50% calorie undercount, committed with no uncertainty signal. The photo path is the product's primary path. | [#218](https://github.com/zexy2/mealog-case-study/issues/218) |
| Cooked dishes resolve to dry catalogue entries | `haşlanmış bulgur` resolves to `tr.bulgur_kuru` at 279.2 kcal, roughly +320%. Six of seven audited cooked inputs resolve to a dry or raw entry and inherit its nutrition. `çay` and `demlenmiş çay` correctly abstain, so the negative-alias mechanism itself works. | Dry-weight nutrition attributed to a cooked serving. The V3 gate routes these to review but does not correct the wrong `food_id`. | [#219](https://github.com/zexy2/mealog-case-study/issues/219) |
| Legumes resolve to each other | `haşlanmış mercimek` to `tr.nohut_haslanmis`, `nohut yemeği` to `tr.kuru_fasulye`, `haşlanmış fasulye` to `tr.nohut_haslanmis`, `tarhana çorbası` to `tr.mercimek_corbasi`. | Wrong food, plausible calories. This is retrieval quality rather than aliasing, and negative aliases will not fix it. | Open, untracked |
| The Turkish catalogue is thin for the default locale | `locale_packs/tr/foods.jsonl` holds 53 rows with no entry for döner, poğaça, börek (including su böreği), köfte, pide, or kebap. | 41 of the 68 rejected golden samples trace wholly or partly to missing catalogue coverage rather than to the confidence threshold. | Open, untracked |
| South Asian cuisine is unrepresented | 16 samples, 0% coverage, Item F1 0.00, FP rate 100%. | The golden set was deliberately not narrowed to fit the catalogue, so this bucket reports honestly instead of being excluded. | Open, untracked |

The false-positive rate is measured over the identity set and counts rejected
samples as well. 68 of 80 samples ended in `ask` and none of them were saved, so
86.0% describes what the perception layer reported, not what the system
committed.

## Compare EatBetter

EatBetter comparison is complete and stays short and evidence-led: product
behavior, workflow, and explicit trade-offs belong in the dedicated
[comparison document](docs/comparison.md), not in a marketing paragraph here.

## Testing

`make test` covers the Python reference behavior, locale-pack integrity,
closed-set resolution, pipeline contracts, and replay safety. `make lint`,
`python scripts/check_invariants.py`, and `python scripts/status.py --check`
cover static and repository-level constraints. `make check` combines these
checks with the offline regression gate.

The TypeScript service has separate build, lint, and test commands. Its focused
tests protect port parity and keep framework code at the edge. The mobile job
typechecks the Expo client and creates an Android bundle.

## Security and privacy limits

- `X-User-Id` is optional and defaults to `demo-user`; it scopes idempotency but
  is not authentication. The service has no user authentication or rate-limit
  layer.
- Idempotency state is process-local in memory. It is not a durable or
  multi-instance guarantee.
- Image uploads use an allow-list and a 10 MiB limit. The application holds
  image bytes in memory for the provider call and does not persist the image or
  raw provider envelope. Provider-side retention follows provider terms; no
  consent or deletion workflow is implemented here.
- Upload validation checks the declared request MIME type; byte-signature
  verification is not claimed.

## Known limitations

- No deployment URL is published.
- Live-provider accuracy is unmeasured; the scorecard replays recorded
  fixtures offline.
- Current main records bundle/export evidence and a coordinator-confirmed
  physical Expo Go smoke, but no interactive iOS Simulator run or live
  mobile-to-Node provider request. Multi-item preservation is unverified.
- The 80-sample scorecard has only 2/2 calorie-eligible/scored rows; most rows
  are partial, zero-truth, or identity-only for calorie purposes.
- Reproduced accuracy defects, including the photographed-count undercount, are
  listed with their evidence under [Known failures, measured](#known-failures-measured).

## With more time

- Rehearse and record the live mobile-to-Node path, then publish a deployment
  URL only after external proof exists.
- Record the complete walkthrough from the merged script with exact review and
  abstention states.
- Add authenticated identity, rate limiting, durable idempotency, and explicit
  consent/deletion controls before treating the service as production-ready.
- Follow the [D8](docs/decisions.md#d8) training plan only after data provenance
  and evaluation gates are ready. D8 is a specified, measured path, not
  permission to tune against a headline.

## AI usage

Human decisions define the closed-set boundary, provenance rules, locale-pack
structure, abstention behavior, and evaluation gates. Models assist with
implementation and review, but their suggestions are overridden when they
conflict with those constraints.

## Questions we'll ask (Direct Answers)

Detailed, evidence-backed answers to the four core case study questions are documented in [docs/interview_questions_answers.md](docs/interview_questions_answers.md):
1. **Biggest Trade-off:** Prioritizing **Precision over Recall** (abstaining with `ABSTAIN` when confidence/catalogue is lacking rather than hallucinating calories).
2. **Top 3 Accuracy Improvements Next:** Automated regional catalogue expansion (TÜRKOMP / OpenFoodFacts), hybrid multimodal visual embeddings (CLIP + BM25), and interactive multi-item bounding box clarification.
3. **What Breaks at Scale:** In-memory idempotency cache (solved by Redis distributed locks), synchronous LLM latency under burst traffic (solved by Kafka / BullMQ worker queues), and provider API rate limits.
4. **Biggest Security / Privacy Risks:** Biometrics & PII in background photos (solved by on-device face blurring & EXIF stripping in [D13](docs/decisions.md#d13)), and Prompt Injection / calorie tampering attacks (prevented by D1 architectural invariant).


<!-- PENDING: one concrete model error, how it was caught, and the human override -->
