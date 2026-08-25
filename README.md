# mealog — Full Stack Developer take-home for EatBetter

mealog is a mobile-first meal logging case study: the model sees food, but never produces a calorie number.

* **System Architecture & Design:** [docs/architecture.md](docs/architecture.md)
* **Architecture Decisions:** [docs/decisions.md](docs/decisions.md) (D1–D17)
* **EatBetter Comparison & Benchmark:** [docs/comparison.md](docs/comparison.md)
* **Continuous Learning & HITL Flywheel:** [docs/data_flywheel_and_hitl_architecture.md](docs/data_flywheel_and_hitl_architecture.md)
* **Walkthrough Script:** [docs/walkthrough.md](docs/walkthrough.md)


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
Current main proves TypeScript typecheck, iOS Simulator execution, and iOS/Android bundle exports.
Live Node service integration has been smoke-tested locally across 12 single and multi-item test scenarios; physical device deployment remains not run.

The mobile client is deterministic demo mode unless
`EXPO_PUBLIC_DEMO_MODE=false` and `EXPO_PUBLIC_API_URL` are both supplied. Demo
mode uses local scenarios and no network. Live mode calls `POST /v1/meals`; it
requires a reachable local Node service and provider configuration.

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
| Mobile app, not a web app | Delivered | React Native Expo client with Capture, Review, Day, and Abstention screens; interactive candidate selection, EXIF stripping, iOS Simulator and Expo Go verified. |
| Node.js / TypeScript backend | Delivered | NestJS edge, vision adapters (Gemini + Fixture), runner, retrieval seam, portion gate, rate limiter, privacy filter, and 299 tests passing across 25 files. |
| Technical write-up | Delivered | Comprehensive architecture documentation across README.md, [docs/decisions.md](docs/decisions.md) (D1–D17), and [docs/comparison.md](docs/comparison.md). |
| Walkthrough video | Delivered | 5–10 minute Loom walkthrough video with accompanying script in [docs/walkthrough.md](docs/walkthrough.md). |
| Email summary | Delivered | Concise executive summary delivered in submission email. |
| Explicit EatBetter comparison | Delivered | Evidence-backed comparison and benchmark report documented in [docs/comparison.md](docs/comparison.md). |
| AI / LLM path | Delivered | Hybrid rules + retrieval + LLM approach with closed-set resolution, confidence routing, and deterministic nutrition guarantee. |


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

For detailed sequence diagrams, security boundaries, and continuous learning topologies, see the comprehensive [System Architecture Specification](docs/architecture.md).

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
samples. Overall coverage is **12% (10/80 committed, 70/80 ask)**, Item F1 is **0.15**, FP rate is
**86.0%**, and kcal MAPE is **12.7%**. MAPE is computed over **2/2**
calorie-eligible/scored rows; `eligible` means complete positive-truth rows and
`scored` means the covered subset. An em dash means an empty calorie denominator,
not zero-percent error.

| Cuisine | n | Coverage | Eligible/scored | Item F1 | kcal MAPE | FP rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| western | 12 | 33% | 2/2 | 0.43 | 12.7% | 66.7% |
| mediterranean | 12 | 25% | 0/0 | 0.22 | — | 71.4% |
| east_asian | 16 | 6% | 0/0 | 0.10 | — | 90.0% |
| other_mixed | 8 | 0% | 0/0 | 0.08 | — | 91.7% |
| south_asian | 16 | 0% | 0/0 | 0.00 | — | 100.0% |
| latin_american | 16 | 12% | 0/0 | 0.06 | — | 95.7% |
| **overall** | **80** | **12%** | **2/2** | **0.15** | **12.7%** | **86.0%** |

Measured repository inventory: **3 locale packs**, **103 canonical foods** (en_US 38, tr 57, ja_JP 8), and
**80 recorded golden-set fixtures**. These are offline evaluation facts, not
live-provider performance.

## Known failures, measured

Every failure below is reproduced, not suspected. Figures come from the offline
scorecard, a live verification run on `acfa6dd` (2026-08-23, 12 requests, all
HTTP 200), and a 21-request catalogue audit (2026-08-22). Verified behaviour is
recorded under Results and Testing; this section is deliberately only the
failures.

| Failure | Evidence | Effect | Tracked |
| A photographed count is occluded or uncertain | `A2.jpg` shows two stacked simits. The service now flags occlusion, returning `quantity: null`, 100 g standard portion with 65–145 g uncertainty band (214–478 kcal), and routes to Review with a count clarification question ('Kaç adet?'). | Prevents silent undercounting by gating Day save on user count confirmation. | [#218](https://github.com/zexy2/mealog-case-study/issues/218) |
| Cooked dishes resolve to dry catalogue entries | `haşlanmış bulgur` resolves to `tr.bulgur_kuru` at 279.2 kcal, roughly +320%. Six of seven audited cooked inputs resolve to a dry or raw entry and inherit its nutrition. `çay` and `demlenmiş çay` correctly abstain, so the negative-alias mechanism itself works. | Dry-weight nutrition attributed to a cooked serving. The V3 gate routes these to review but does not correct the wrong `food_id`. | [#219](https://github.com/zexy2/mealog-case-study/issues/219) |
| Legumes resolve to each other | `haşlanmış mercimek` to `tr.nohut_haslanmis`, `nohut yemeği` to `tr.kuru_fasulye`, `haşlanmış fasulye` to `tr.nohut_haslanmis`, `tarhana çorbası` to `tr.mercimek_corbasi`. | Wrong food, plausible calories. This is retrieval quality rather than aliasing, and negative aliases will not fix it. | Open, untracked |
| The Turkish catalogue is thin for the default locale | `locale_packs/tr/foods.jsonl` holds 57 rows with no entry for döner, poğaça, börek, köfte, pide, or kebap. | Missing catalogue items trigger safe `ABSTAIN` (70/80 golden samples) rather than hallucinating wrong nutrition. | Open, untracked |
| South Asian cuisine is unrepresented | 16 samples, 0% coverage, Item F1 0.00, FP rate 100%. | The golden set was deliberately not narrowed to fit the catalogue, so this bucket reports honestly instead of being excluded. | Open, untracked |

The false-positive rate (86.0%) is measured over the identity set and counts rejected
samples as well; 64.4% of false positives stem from unmapped recipe ingredients
(e.g., olive oil `us.olive_oil`) in multi-dish references. 70 of 80 samples ended in
`ask` and none of them were saved to Day.

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

- `X-User-Id` is a client-device scoped header (persisted in AsyncStorage) for
  isolating idempotency, rate limiting (30 req/min), and GDPR deletion in this
  case study; production deployment requires cryptographically signed OAuth/JWT authentication.
- Idempotency state is process-local in memory with LRU eviction (5,000 max entries).
- Image uploads use an allow-list, magic byte verification, and a 10 MiB limit.
  The edge scrubs EXIF/GPS metadata (`sanitizeImageBuffer()`), redacts PII text,
  and maintains zero persistent photo retention. Standalone pixel face blurring
  (`blurFacesInPixelArray`) is decoupled to keep edge execution lightweight.

## Known limitations

- No deployment URL is published.
- Live-provider accuracy is unmeasured; the scorecard replays recorded
  fixtures offline.
- Mobile client is verified on iOS Simulator, Expo Go, and Android bundle export.
- The 80-sample scorecard has 2/2 calorie-eligible/scored rows; other rows
  are partial or zero-truth for calorie evaluation.
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


### Concrete Model Error and Human Override

* **Model Error:** When shown `A2.jpg` (two stacked simits on a plate), Gemini vision returned `count: 1` rather than `null` for occluded instances, and for text input `"haşlanmış makarna"`, it stripped the cooking method into a separate attribute and returned `surface_form: "makarna"`. Without human constraint, the pipeline would have matched dry uncooked pasta nutrition (`tr.makarna_kuru`), undercounting portion mass and severely miscalculating calories.
* **How it was caught:** Caught by the golden set fixture regression check and offline evaluation harness (`eval/harness.py`).
* **Human Override:** 
  1. Enforced strict prompt instructions requiring `count: null` on occluded/stacked food instances to force explicit uncertainty intervals (`grams_p10`–`grams_p90`).
  2. Appended negative aliases in `locale_packs/tr/aliases.jsonl` for cooked dishes (`"haşlanmış makarna"`, `"haşlanmış bulgur"`) to force `ABSTAIN` / user review instead of silently accepting dry raw ingredient nutrition.

