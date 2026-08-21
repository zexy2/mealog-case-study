# mealog — Full Stack Developer take-home for EatBetter

mealog is a mobile-first meal logging case study: the model sees food, but never produces a calorie number.

<!-- PENDING: walkthrough link, demo gif -->
<!-- TODO(Tue): Expo QR + deployed API URL -->

## Run it

Runtime versions are pinned by the project workflow: Python 3.11 for the offline research harness and Node.js 22 for the delivered TypeScript service and mobile app.

### Offline research path

This path is keyless. It replays repository fixtures from `eval/fixtures/` against locale and golden-set data; no provider token or network call is required.

```sh
MEALOG_VENV="$(mktemp -d)/venv"
python3.11 -m venv "$MEALOG_VENV"
. "$MEALOG_VENV/bin/activate"
python -m pip install -e "server[dev]"
make check
```

`make eval` runs the offline evaluation harness directly when a scorecard refresh is needed.

### TypeScript service

```sh
cd server
npm ci
npm run build
npm run lint
npm run test
```

### Mobile app

```sh
cd apps/mobile
npm ci
npm run typecheck
npx expo export --platform android
```

The emulator route is `npm run android` from `apps/mobile` after an Android emulator is configured. The live emulator flow remains pending verification; this README does not claim device execution.

<!-- PENDING: NestJS meal endpoint and keyless mobile-to-edge run after the remaining port work. -->

## What I built vs the brief

| Brief requirement | Status | Evidence or reason |
| --- | --- | --- |
| Mobile app, not a web app | Partial | Expo client has capture, review, and day screens; emulator walkthrough remains pending. |
| Node.js / TypeScript backend | Partial | NestJS edge and framework-free core ports exist; meal edge wiring and provider adapters remain pending. |
| Technical write-up | Partial | Repository docs and this reviewer skeleton exist; results and walkthrough evidence remain pending. |
| Walkthrough video | Deferred | Recording and hosted link are pending. |
| Email summary | Deferred | Summary has not been drafted. |
| Explicit EatBetter comparison | Partial | Comparison is kept as a separate evidence document; its link is pending. |
| AI / LLM path | Partial | Model perception is separated from closed-set resolution and deterministic nutrition; live provider path remains pending. |

## Architecture

```text
photo or text
     |
perception -> normalize -> retrieve -> resolve -> portion -> nutrition -> gate
     |                                             |
  evidence                                   food_id or ABSTAIN
```

Perception may return observed food descriptions and uncertainty. Normalize makes text comparable across spelling, diacritics, and locale. Retrieval proposes catalogue candidates. Resolve accepts only a catalogue `food_id` or `ABSTAIN`; it never emits free text. Portion estimates serving size while retaining uncertainty. Nutrition is the only stage allowed to produce nutrient numbers, using locale-pack data rather than model prose. The final gate decides whether to save, ask for review, or abstain.

The delivered service is Node.js / TypeScript. NestJS owns the edge boundary; pure core stages stay framework-independent so parity tests can compare ports against the Python reference. The Python harness remains research tooling for fixtures, golden labels, and offline evaluation. It is not presented as the delivered API.

## Key decisions

| Decision | Rejected alternative | Constraint | Cost |
| --- | --- | --- | --- |
| [D1](docs/decisions.md#d1) — model never produces nutrition | Ask the model for calories directly | Only deterministic nutrition code may produce nutrient numbers | Catalogue misses become review or abstention cases |
| [D2](docs/decisions.md#d2) — locale data lives in packs | Add market-specific branches to pipeline code | Market variation must remain data, with pack licensing visible | Pack maintenance and legal review grow with markets |
| [D3](docs/decisions.md#d3) — report worst-case cuisine and coverage | Report only an overall mean | Distribution shift must stay visible to reviewers | Small buckets remain noisy and harder to summarize |
| [D9](docs/decisions.md#d9) — Expo React Native client with focused screens | Ship a web app or a different mobile stack | Reviewer path must be a real phone flow | Expo and native runtime constraints remain |
| [D12](docs/decisions.md#d12) — NestJS edge, TypeScript service, Python harness | Rewrite evaluation before parity or keep Python at the edge | Pure-core parity gates the port; Python stays research tooling | Two runtimes create temporary maintenance and release ceremony |

## Results

<!-- PENDING: measurement refresh -->

## Compare EatBetter

EatBetter comparison will stay short and evidence-led: product behavior, workflow, and explicit trade-offs belong in the dedicated [comparison document](docs/comparison.md), not in a marketing paragraph here.

<!-- PENDING: comparison document link after its owning change merges -->

## Testing

`make test` covers the Python reference behavior, locale-pack integrity, closed-set resolution, pipeline contracts, and replay safety. `make lint`, `python scripts/check_invariants.py`, and `python scripts/status.py --check` cover static and repository-level constraints. `make check` combines these checks with the offline regression gate.

The TypeScript service has separate build, lint, and test commands. Its focused tests protect port parity and keep framework code at the edge. The mobile job typechecks the Expo client and creates an Android bundle.

The offline evaluation harness is separate from the unit-test suite: it is Python research tooling that replays fixtures and golden labels. The delivered service is Node.js / TypeScript. Live provider responses, emulator or device execution, and production deployment behavior are intentionally not claimed here.

## Known limitations

<!-- PENDING: golden-set size and scorable count -->
<!-- PENDING: catalogue coverage -->
<!-- PENDING: locale coverage -->
<!-- PENDING: abstention rate -->

## With more time

- Finish edge runner and provider adapters, then require parity evidence before removing any Python serving path.
- Run the complete emulator flow and publish a walkthrough with the exact review and abstention states.
- Expand source-backed golden data, refresh measurements, and document the remaining failure modes.
- Add durable idempotency and explicit provider degradation behavior at the edge.
- Follow the [D8](docs/decisions.md#d8) training plan only after data provenance and evaluation gates are ready. D8 is a specified, measured path, not permission to tune against a headline.

## AI usage

Human decisions define the closed-set boundary, provenance rules, locale-pack structure, abstention behavior, and evaluation gates. Models assist with implementation and review, but their suggestions are overridden when they conflict with those constraints.

<!-- PENDING: one concrete model error, how it was caught, and the human override -->
