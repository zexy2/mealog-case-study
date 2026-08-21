# mealog — Full Stack Developer take-home for EatBetter

Photo- and text-based meal logging where the model never produces a calorie number: nutrition is resolved from canonical foods, and accuracy is measured per cuisine.

<!-- TODO(Tue): demo.gif + Expo QR + deployed API URL -->

## Run it

Requires Python 3.11. Use the versioned interpreter name below on systems where
`python` is not installed. **No API key is needed** for this path: the default
provider replays recorded responses, so the scorecard is reproducible offline.

```bash
python3.11 --version                    # 1. verify the pinned interpreter
python3.11 -m venv .venv                # 2. create an isolated environment
. .venv/bin/activate                    # 3. activate it
python -m pip install -e "server[dev]"  # 4. install the declared dependencies
make eval                               # 5. reproduce the scorecard offline
make test                               # 6. run the tests
make check                              # 7. everything CI runs
```

`make eval`, `make test`, and `make check` do not call a provider or need network
access after installation. `make eval-live` calls the real provider and needs
`GEMINI_API_KEY`; see `.env.example`.

### Docker API path

Docker Engine/Desktop with Compose v2 is optional. This path uses the fixture
provider, so it needs no API key. From the repository root:

```bash
unset GEMINI_API_KEY
docker compose up -d --wait
curl -fsS -w '\n' http://localhost:8000/health
curl -fsS -w '\n' -X POST http://localhost:8000/v1/meals \
  -H 'content-type: application/json' \
  -d '{"idempotency_key":"reviewer-smoke-1","sample_id":"n5k_0001","text":"rice","locale":"en_US","config":"V3"}'
docker compose down --volumes
```

The request includes `text` and the fixture-only `sample_id` so the clean-clone
smoke test can replay a recorded response without an image or provider key. A
live request uses an image or text with `VISION_PROVIDER=gemini` instead.

### Troubleshooting

- **`python: command not found`:** use `python3.11` for the venv command above;
  after activation, `python` points to that venv.
- **`GEMINI_API_KEY` errors:** keep the default `VISION_PROVIDER=fixture` for
  offline eval and the Docker smoke path. Only `make eval-live` and a live API
  run need a key.
- **Port 8000 or 5432 is busy:** stop the conflicting process, then rerun
  `docker compose up -d --wait`; use `docker compose down --volumes` to clean up.
- **Docker is unavailable:** use the Python path above. Docker is only required
  for the API smoke path, not for the offline scorecard or tests.

### Mobile app

```bash
cd apps/mobile && npm install && npm start  # scan QR with Expo Go
```

The app opens in fixture-shaped demo mode with no API key. To exercise the API,
set `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_DEMO_MODE=false`; for a recorded
fixture smoke test, also set `EXPO_PUBLIC_FIXTURE_SAMPLE_ID=tr_0001` and use
the text input. Camera and text share the same client-generated idempotency key.

## What I built vs. the brief

| Brief item | Status | Note |
|---|---|---|
| End-to-end meal logging flow | Partial | Pipeline, API, and Expo client exist; device and live-provider execution are unclaimed. |
| Mobile app experience (not web) | Partial | Three Expo screens export in CI; device execution is unverified. |
| AI path: **hybrid (rules + retrieval + LLM)** | Implemented | Rules, retrieval, closed-set resolution, and provider boundary exist; fixtures are offline default. |
| Accuracy evaluation (metrics, test set, error taxonomy) | Partial | Metrics and taxonomy exist; the nine-sample fixtures remain synthetic. |
| Hallucination reduction | Implemented | Closed-set resolution is enforced; only `pipeline/nutrition.py` produces nutrition. |
| Reliability (idempotency, retries, errors) | Partial | Idempotency and errors exist; durable storage and degradation are omitted. |
| Observability (simple is fine) | Implemented | JSON logs include request IDs and stage timings. |
| Fine-tuning plan | Specified, not trained | D8 rents the VLM, specifies one adapter, and trains nothing. |
| Technical write-up / Loom / email | Partial; Loom and email omitted | README/docs exist; external handoff artifacts are not claimed. |

## Results

<!-- RESULTS: filled by #57 -->

## Why worst-cuisine is the headline metric

Published accuracy for photo-based dietary assessment is measured on evaluation
sets that are ~62% Western. Independent re-analysis puts the worst-to-best error
ratio across cuisines at **1.6x–2.4x**. For a product expanding into new markets,
that gap is the largest unmeasured risk — so the headline metric here is the
**worst cuisine bucket**, not the mean, and a new market ships as a data pack with
a measured onboarding cost.

## Architecture

```
input ──▶ perception ──▶ normalize ──▶ retrieval ──▶ resolve ──▶ portion ──▶ nutrition ──▶ gate
         (VLM/text)     (locale pack)  (catalogue)  (closed set) (distribution) (pure fn)  (route)
```

| Stage | Responsibility | May produce nutrients? |
|---|---|---|
| perception | observe items, cooking method, portion hints | ❌ |
| normalize | locale text folding, unit lexicon | ❌ |
| retrieval | candidate canonical foods | ❌ |
| resolve | pick a `food_id` from candidates, or `ABSTAIN` | ❌ |
| portion | grams as median + p10/p90 | ❌ |
| **nutrition** | `Σ (grams/100) × per_100g` | ✅ **only here** |
| gate | auto-accept / review / ask one question | ❌ |

## Key decisions

See [`docs/decisions.md`](docs/decisions.md) for D1–D11. The three that shape
everything:

1. **D1: the model never produces a nutrient number.** It proposes observed items;
   a pure, unit-tested function computes nutrition from the catalogue.
2. **D2: a locale is data, not code.** Packs carry foods, aliases, units, rules,
   and licensing; no locale is named in `server/src`.
3. **D3: the headline metric is the worst cuisine.** Accuracy is read with
   coverage, and CI fails if *any* bucket regresses, not just the average.

## Testing

`make test` currently runs 80 tests. They are selected by risk rather than
coverage: nutrition arithmetic (the only place numbers are made), locale-pack
integrity, the closed-set guarantee, API contracts, pipeline stages, and
idempotent replay. `docs/evaluation.md` covers accuracy evaluation separately.
Deliberately untested are live-provider calls, Expo device behaviour, and
production multi-process behaviour; those require external services or hardware.

## Assumptions

The brief was complete, so no clarifying questions were needed. Where it was
silent, the ambiguity, evidence, decision, and reversal cost are recorded in
[`docs/assumptions.md`](docs/assumptions.md):

- **A1 Scope:** one narrow end-to-end slice, with depth spent on measurement.
- **A2 Market:** cuisine-stratified evaluation, led by the worst bucket.
- **A3 Friction:** the system may ask one question when it is unsure.

## Known limitations

The golden set has 9 samples: 2 Tier 1 and 7 Tier 3. Its recorded fixtures are
synthetic, so the scorecard is harness evidence rather than real-provider
accuracy. The idempotency store is in memory and process-local; a restart or
another replica loses its keys. Nothing is trained: D8 rents the frontier VLM,
specifies a locale adapter and a mass regressor, and deliberately trains neither.
The confidence gate is held at its current operating point while portion
uncertainty is reviewed. Live-provider and device execution remain unverified.

## With more time

1. Replace synthetic fixtures and labels with source-backed inputs first; this is
   the riskiest assumption behind any accuracy claim.
2. Run the live provider and Expo client on real devices, recording failures and
   latency rather than inferring them from offline tests.
3. Train and evaluate only the D8 locale adapter after the real data and gates
   are in place; keep the frontier VLM rented.
4. Replace the process-local idempotency map with durable shared storage and add
   the provider degradation ladder.

## Time spent & scope

The work was scoped to the six-day brief window. No hour-by-hour timesheet was
kept, so I do not claim a precise total. Live provider fixtures, real labels,
fine-tuning, production persistence, a Loom walkthrough, and the email handoff
were cut from this repository.

## Tech & dependencies

- Python 3.11: the declared runtime and reproducible reviewer baseline.
- FastAPI, Uvicorn, Pydantic: typed HTTP contracts and the API server.
- PyYAML and scikit-learn: locale rules and the n-gram retrieval implementation.
- python-multipart: bounded multipart photo ingestion.
- pytest and Ruff: test and lint gates used by CI.
- Expo, React Native, TypeScript: the required mobile client stack.
- Docker Compose and Postgres: repeatable API smoke infrastructure.

## AI usage

Several coding agents worked this repository in parallel under a written
contract (`AGENTS.md`) with issue-based claims, CI-enforced scope, append-only
session logs, and human-reviewed merges. The human decided the constraints that
the model never produces a nutrient number, a locale is a data pack, the
worst-cuisine bucket is the headline metric, evaluation replays fixtures
offline, and every entry in [`docs/decisions.md`](docs/decisions.md). The agents
implemented within those decisions; ownership stayed with the human.

<!-- HUMAN OVERRIDE EXAMPLE: @zexy2 to add one concrete case where an agent's output was overruled. -->

## Project structure

```
locale_packs/{en_US,tr,ja_JP}/   market data: foods, aliases, units, text rules
server/src/mealog/
  domain/        models + error taxonomy (shared with eval)
  pipeline/      one module per stage; nutrition.py is pure
  adapters/      vision providers (live + fixture replay)
  locales/       pack loader
  api/           FastAPI surface, idempotency
eval/
  harness.py     runs configs over the golden set → scorecard
  metrics.py     per-cuisine aggregation, coverage, worst-bucket
  golden/        manifest + labelling protocol
  fixtures/      recorded provider responses (offline reproducibility)
docs/            decisions · evaluation · finetuning-plan
AGENTS.md        coordination contract for multi-agent work
log/             append-only session logs (one file per session)
AGENT_LOG.md     compatibility pointer; do not append
```
