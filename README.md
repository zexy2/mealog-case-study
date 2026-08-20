# mealog — Full Stack Developer take-home for EatBetter

Photo- and text-based meal logging that turns messy input into **canonical foods,
portions and nutrition**, and measures its own accuracy **per cuisine** rather than
in aggregate.

> Published accuracy for photo-based dietary assessment is measured on
> evaluation sets that are ~62% Western. Independent re-analysis puts the
> worst-to-best error ratio across cuisines at **1.6x–2.4x**. For a product
> expanding into new markets that gap is the largest unmeasured risk — so the
> headline metric here is the **worst cuisine bucket**, not the mean, and a new
> market ships as a data pack with a measured onboarding cost.

<!-- TODO(Tue): demo.gif + Expo QR + deployed API URL -->

> **Working in this repo as an AI agent?** Read [`AGENTS.md`](AGENTS.md) first —
> it is the coordination contract (claims, branches, invariants, handoffs).

## Run it

Requires Python 3.11. **No API key needed** — the default path replays recorded
provider responses, so the scorecard below is reproducible offline.

```bash
cd server && pip install -e ".[dev]"    # 1. install
cd .. && make eval                      # 2. reproduce the scorecard
make test                               # 3. run the tests
make check                              # 4. everything CI runs
```

Optional: `make db && make api` for the HTTP surface, `make eval-live` to hit the
real provider (needs `GEMINI_API_KEY`; see `.env.example`).

## What I built vs. the brief

| Brief item | Status | Note |
|---|---|---|
| End-to-end meal logging flow | 🚧 | pipeline + API done; mobile app Mon |
| Mobile app experience (not web) | 🚧 | Expo/React Native, 3 screens |
| AI path: **hybrid (rules + retrieval + LLM)** | 🚧 | chosen path; see Key decisions |
| Accuracy evaluation (metrics, test set, error taxonomy) | 🚧 | harness runs; golden set seeded (n=9 → 80) |
| Hallucination reduction | ✅ | closed-set resolution, structurally enforced + tested |
| Reliability (idempotency, retries, errors) | 🚧 | idempotent POST + test; retry/fallback Mon |
| Observability (simple is fine) | ✅ | structured JSON logs, request_id, per-stage timings |
| Fine-tuning plan | 🚧 | `docs/finetuning-plan.md` |
| Technical write-up / Loom / email | 🚧 | |

<!-- TODO(Tue): flip to ✅/⚠️ + add "deliberately skipped" rows with reasons -->

## Results

<!-- TODO(Sun): paste eval/reports/scorecard.md ablation table here -->
Run `make eval`. Current output is **harness validation only** — fixtures are
seeded placeholders, so the numbers are not yet claims about the system.

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

See `docs/decisions.md` for the full log. The three that shape everything:

1. **The model never does arithmetic.** It proposes references; a pure, unit-tested
   function computes nutrition from the catalogue.
2. **A locale is data, not code.** No locale is named anywhere in `server/src`.
3. **The headline metric is the worst cuisine**, and CI fails if *any* bucket
   regresses — not just the average.

## Testing

10 tests, chosen by risk rather than coverage: nutrition arithmetic (the only
place numbers are made), locale-pack integrity, the closed-set guarantee, and
idempotent replay. `docs/evaluation.md` covers the accuracy evaluation, which is
a separate concern from unit tests.

<!-- TODO(Tue): Assumptions · Known limitations · With more time · Time spent
     · Tech & dependencies · AI usage · Project structure -->

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
AGENT_LOG.md     append-only session log
```
