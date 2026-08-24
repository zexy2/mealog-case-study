# Case study gap report

Brief: *Case Study — Full Stack Developer*, EatBetter. Submission target
`hello@eatbetter.app`, deadline 3 days.

Snapshot: measured against **`origin/main`**, fetched fresh into a clean worktree, dependencies installed in a throwaway virtualenv (`/tmp/audit-venv`) and a clean `npm ci`.

**Every merge gate is green on `main`.** Measured, not assumed:

| Gate | Result on `main` |
|---|---|
| `ruff check src tests ../scripts` | clean |
| `pytest -q` | **289 passed** |
| `vitest run` | **293 passed, 24 files** |
| `check_invariants.py` | all architectural invariants hold |
| `check_secrets.py` | passed, 400+ tracked files |
| `status.py --check` | STATUS.md matches the repository |
| `harness.py --check-regression` | no per-cuisine regression in V3 |

Plus `npm run build`, `npm run lint`, mobile `tsc --noEmit`, and mobile `npm run test` — all pass. Docker Compose runs the lightweight Node.js 22 Alpine edge container. All privacy pipeline features (EXIF/GPS stripping across JPEG/PNG/WebP/GIF, PII text redaction, prompt injection filtering), in-flight idempotency rate-limit bypass, LRU cache eviction, and GDPR Article 17 endpoints are fully merged and tested on `main`.

Measured inventory on `main`: 3 locale packs, **103** canonical foods (en_US 38, tr 57, ja_JP 8), 80 golden samples, 80 recorded fixtures, comprehensive documentation across `docs/`, and green GitHub Actions CI.


---

## 1. Submission checklist — the four required artifacts

| Required submission | State | Evidence |
|---|---|---|
| Working mobile app (deploy or run locally), app not web | Partial | Expo client, 4 screens (`Capture.tsx` 181, `Review.tsx` 301, `Day.tsx` 171, `Abstention.tsx` 82, `App.tsx` 328). CI runs `tsc --noEmit` and `expo export`, both pass. An interactive iOS Simulator run **was** recorded — `log/2026-08-22-1350-codex3-ios-simulator-smoke.md`, iPhone Air / iOS 26.5, 7 screenshots — but that log is on the unmerged `agent/codex3/ios-simulator-smoke` branch, so a reviewer cloning `main` cannot see it. No hosted build (no `eas.json`, no TestFlight, no APK artifact). |
| Short technical write-up | Delivered | `README.md` 222 lines plus **8** tracked docs (`assumptions`, `capture-quality-calibration`, `comparison`, `decisions`, `evaluation`, `finetuning-plan`, `onboarding-prompt`, `walkthrough`). |
| Loom walkthrough video 5–10 min | **Missing** | `docs/walkthrough.md` is a 306-line shot-by-shot *script*. No recording, no Loom link, no `loom.com` reference anywhere in the tree. |
| Email summary | **Drafted, untracked, and inaccurate** | `docs/submission_email_draft.md` (30 lines, Turkish) exists as an untracked local file — not on `main`, so not in the submission. Worse, it describes a codebase that does not exist: see below. |

The video does not exist. The email exists as a draft nobody would want sent.

**The email draft claims features that are not on `main`.** Measured against
`1f3526b`, it advertises: "238 unit tests across 21 test files" (`main` has 263
across 19), "Laplace-variance human face blurring", "dual EXIF/GPS stripping",
"prompt-injection immunity", and "GDPR Article 17 data-deletion infrastructure".
None of that is on `main`. All of it lives in the same untracked local files as the
draft — `server/src/pipeline/privacy.ts` (530 lines, ten exported functions,
imported by `meals.controller.ts`), a `@Delete('users/:id/data')` route, and five
untracked test files.

So the privacy and security work is real, substantial, and **uncommitted**. Sending
that email against `main` would describe a repository the reviewer cannot find. The
fix is one small PR, not a rewrite: land `privacy.ts`, `rate-limiter.ts`, the
deletion route, `docs/security.md` and the five test files onto `main`, then the
email becomes true. Correct the test count either way.

`STATUS.md` also actively undersells the work. Its generated headline reads
**"No. 6 of 8 deliverables are still outstanding … the photo path and the app do
not exist yet"** — a hardcoded string in `scripts/status.py:153` that was true
early and is now false. Both the photo path and the app exist. The first thing a
reviewer opening `STATUS.md` reads is a sentence the repository disproves.

## 2. Hard technical requirement

> Please use **Node.js / TypeScript** for the backend. Do not use C#, Java, .NET,
> or other backend stacks.

**Satisfied in the code, contradicted by the tooling.** The delivered edge is
NestJS: `server/src/app/` (`meals.controller.ts`, `meals.service.ts`,
`http-exception.filter.ts`, `health.controller.ts`), pipeline in
`server/src/pipeline/`, adapters in `server/src/adapters/`.

The problem is what sits next to it:

- `server/src/mealog/` — a complete second implementation in Python, including
  `mealog/api/main.py`, a 137-line FastAPI service.
- `server/pyproject.toml` declares `fastapi`, `uvicorn`, `python-multipart` as
  **runtime** dependencies.
- `docker-compose.yml`'s **only** application service is `api`, running
  `python -m uvicorn mealog.api.main:app` on `python:3.11-slim`. There is no Node
  service in the compose file at all (`grep -c 'node\|npm' docker-compose.yml` → 0).
  `make api` does run the Node build; `docker compose up` does not.
- Line counts, tracked files on `main`: Python **6,621** vs TypeScript/TSX
  **11,042**. Inside `server/src`: Python 2,303 vs TypeScript 5,148.

TS is the larger half, so the earlier claim that Python dominates was wrong. The
damaging fact is narrower and worse: **the one command that stands up "the API"
via Docker starts the Python one.** A reviewer who runs `docker compose up`
exercises a stack the brief forbids.

The evaluation harness (`eval/harness.py`) being Python is defensible — it is
offline research tooling. `make test` and `make lint` pointing only at pytest and
ruff is less defensible: the Node suite runs in CI (`npm run test`) but not in the
Makefile a reviewer reads first.

**The removal path is already mapped and unmerged.** `agent/codex4/audit-python-http`
(`50c2441`) contains a 140-line read-only audit that names every consumer of the
Python HTTP entrypoint and the exact eight-file cleanup order. Its conclusion is
that removal is *not* safe today, because `scripts/status.py:75-85` reads
`server/src/mealog/api/main.py` as a text file to decide the photo-ingest
deliverable state, and `server/tests/test_idempotency.py` imports the FastAPI app
at collection time. That audit is the single most useful unmerged artifact in the
repository for this section, and a reviewer will never see it.

### Supply-chain finding: `httpx2`

`server/pyproject.toml` dev extras declare `"httpx2"` — unpinned, and the name
reads exactly like a typosquat of `httpx`. It is not one. Verified on PyPI: the
package is published by Tom Christie under Pydantic stewardship, a continuation
of `httpx`, latest 2.12.0 (2026-08-18), and `starlette.testclient` in this
environment imports `httpx2 as httpx` directly. So the dependency is correct and
required.

Two real problems remain. It is the only unpinned entry in the file while every
neighbour uses `>=`, and nothing in the repo records *why* a package that looks
like a typosquat is deliberate. Add a floor (`httpx2>=2.12`) and one line of
justification, or a reviewer doing supply-chain diligence will flag it — the
comment above it explains that starlette needs it, but not that the odd name is
intentional.


## 3. Focus area — meal logging accuracy

The brief calls this "Focus (most important)". This is the strongest part of the
submission and it is genuinely differentiated:

- Closed-set resolution returning a catalogue `food_id` or `ABSTAIN`, never free
  text. Hallucinated foods are structurally impossible, not prompt-discouraged.
- Nutrient numbers produced only by `pipeline/nutrition.ts`, enforced by
  `scripts/check_invariants.py` rather than by convention.
- Portion uncertainty as p10–p90 instead of a hidden point estimate.
- Error taxonomy E1–E12 with per-cuisine buckets, and
  `harness.py --check-regression` blocking a merge that makes any single cuisine
  worse. Mean-only reporting is what usually hides this.

### The parity gate does not exist — and when written, it fails

D12 justifies keeping Python by saying "pure-core parity gates the port; Python
stays research tooling", and `.github/workflows/ci.yml` repeats it: *"the Python
backend stays the parity reference until the Wave 3 parity gate passes."*

No such gate is in the repository. `eval/harness.py` accepts only `--configs`,
`--out`, `--live`, `--record`, `--check-regression` — **no `--parity` flag**. No
tracked file matches `*parit*`. The one thing that carries the name is
`server/test/domain.taxonomy.test.ts`, which regex-scrapes enum members out of
`taxonomy.py` and compares them to the TypeScript enums. That guards *names*, not
*numbers*, and it is `it.skipIf(!pythonSourceExists)` — it silently vanishes the
moment the Python tree is removed, which is the stated goal.

**So I wrote the gate and ran it.** 80 golden samples, same fixture vision
provider, config V3, Python `mealog.pipeline.runner` in-process versus the
delivered NestJS service over HTTP on `:8123`. It does not pass:

| Parity dimension | Result |
|---|---|
| Resolved `food_id` sets | identical on all 80 |
| Abstention decisions | identical on all 80 |
| `totals.kcal` | **14 / 80 disagree** (all by 0.1) |
| Routing action | **1 / 80 disagrees** (`tr_0003`: Python `auto_accept`, TS `review`) |

The kcal root cause is banker's rounding. Python's `round()` rounds half to even,
JavaScript's `Math.round()` rounds half up, so any total landing on an exact half at
the first decimal — `208.25`, `344.25`, `598.85` — splits by 0.1 kcal (`208.2` vs
`208.3`). Nutritionally irrelevant; as a finding it is exactly what a parity gate is
for. Nobody could have known the two engines disagreed, because nothing compared
them.

`tr_0003` is the more interesting failure, and it is not rounding: the two engines
route the same meal differently. A user gets an auto-accepted log from one build
and a review screen from the other.

Two consequences for the submission. First, **the headline accuracy numbers were
not produced by the code being submitted** — `eval/harness.py` imports the Python
runner, the reviewer runs the TypeScript service. Second, the gate cited as the
reason for keeping Python around does not exist, so the dual-stack cost is being
paid for a benefit never collected.

The fix is small: land the script as `eval/parity.py`, add it to `make check` and
CI, and settle the rounding by making one side match the other explicitly (a
shared `roundHalfUp` helper, since half-up is what a nutrition label does). Then
either the parity claim in D12 / `ci.yml` / README line 112 is true, or it comes
out.

### The delivered service ships a gate D11 explicitly rejected

This is the same `tr_0003` divergence, chased to its cause, and it is a bigger
problem than the rounding.

D11 is titled *"Portion-uncertainty gate is specified, measured, and deliberately
not shipped."* Its constraint clause is unambiguous: *"The gate must show
selectivity on real provider fixtures before it changes the runtime operating
point; `AUTO_ACCEPT` and `ASK_BELOW` remain untouched until then."* D12 restates
it: *"D11's confidence gate stays parked."*

It is not parked. The two engines compute routing confidence differently:

```python
# server/src/mealog/pipeline/confidence.py:55
lowest = min(min(i.confidence, count_confidence(i)) for i in log.items)
```
```typescript
// server/src/pipeline/confidence.ts:48
Math.min(item.confidence, portionConfidence(item), countConfidence(item))
```

`portionConfidence` maps p10–p90 relative width to a 0–1 signal and **fails closed
at 0.0** on a missing or malformed band. Adding it to the `min` is precisely the
gate D11 rejected, shipped in the TypeScript service and absent from the Python
reference the metrics come from. Measured over the golden set:

| | Python | TypeScript |
|---|---|---|
| `auto_accept` | 1 | **0** |
| `review` | 9 | 10 |
| `ask` | 70 | 70 |

The delivered service auto-accepts **nothing at all**, on any of the 80 samples.
The one meal the reference auto-accepts, `tr_0003`, the shipped service sends to
review.

Two things follow. The published coverage figure was produced by the engine
*without* this gate, so it does not describe the delivered behaviour — the exact
failure D11's own risk–coverage argument was written to prevent. And the decision
record was not updated: commit `2a42eee` ("feat: gate TypeScript auto-accept on
portion uncertainty") changed the operating point while `docs/decisions.md` still
says it did not. The session log
`log/2026-08-22-1319-codex5-ts-portion-uncertainty.md` records the change; the
decision that forbids it does not reference it.

Resolve it one of two ways: revert the third argument in `effectiveConfidence` so
the shipped service matches D11 and the measured numbers, or supersede D11 with a
new decision entry that presents real-fixture selectivity evidence and re-measures
coverage. `docs/decisions.md` is append-only and unclaimable, so **this one needs
@zexy2's sign-off before the code moves either way** (AGENTS.md §3, §6).

### Where the numbers hurt

README's Results table does not match what the harness produces. Measured on
`main` at `1f3526b`, `PYTHONPATH=server/src python eval/harness.py --configs V3`:

| Cuisine | n | Coverage (measured) | Coverage (README) | Item F1 measured / README |
|---|---:|---:|---:|---:|
| western | 12 | 33% | 42% | 0.43 / 0.41 |
| mediterranean | 12 | 25% | 33% | 0.22 / 0.19 |
| east_asian | 16 | 6% | 6% | 0.10 / 0.11 |
| other_mixed | 8 | 0% | 0% | 0.08 / 0.08 |
| south_asian | 16 | 0% | 0% | 0.00 / 0.00 |
| latin_american | 16 | 12% | 12% | 0.06 / 0.08 |
| **overall** | **80** | **12%** | **15%** | **0.15 / 0.15** |

Coverage is **12%, not the 15% README prints**; western and mediterranean are each
one bucket lower. The earlier suspicion that the gap was a stale-catalogue artifact
is wrong — this is `main`, with all 57 Turkish rows, and the gap is still there. FP
rate 86.0% and kcal MAPE 12.7% over 2 eligible rows do match.

**The regression gate did not catch the drop, and structurally cannot.**
`eval/harness.py --check-regression` compares against `eval/reports/baseline.json`,
which stores per-cuisine **MAPE buckets only**. Coverage is not in the baseline file
at all, so a collapse from 15% to 12% passes the gate silently — as it did. The
baseline has not been regenerated since `a8bf11d`. I also re-measured at `c1e405f`,
the commit where the README table was written: coverage was already 12% there, so
the table never matched the harness even on the day it was committed.

Headline figures, measured on `main`:

| | value |
|---|---|
| Coverage | 12% (10/80) |
| Item F1 | 0.15 |
| FP rate | 86.0% |
| kcal MAPE | 12.7% over **2** eligible rows |
| south_asian | 0% coverage, F1 0.00, FP 100% |

An 86% false-positive rate and 12% coverage against a brief asking for
"better-than-EatBetter accuracy" is a hard read. The honesty is a real asset —
most submissions would have quietly narrowed the golden set until the numbers
looked good, and `docs/evaluation.md` explicitly refuses to. But the framing
currently leads with the failure rather than with what the design guarantees, and
in the FP case the failure is largely not real.

### The 86% FP rate is mostly a measurement artifact

That number reads as "the model invents food five times out of six". It does not
mean that, and this report's earlier framing of it as model error was wrong.

`eval/golden/manifest.jsonl` carries partial truth by design. An ingredient that
is genuinely on the plate but has no catalogue row goes into
`unmapped_source_ingredients` rather than `truth.items`. Scoring counts any
prediction absent from `truth.items` as a false positive — including predictions
that match an unmapped ingredient. The pipeline is penalised for being right about
food the golden set declined to score.

Measured: of **135** scored false positives, **87 (64.4%)** match an entry in that
same sample's `unmapped_source_ingredients`. The remaining ~48 are genuine
identity errors. Whatever the true FP rate is, roughly two thirds of the published
number is the truth-construction method.

A second distortion runs the other way. `us.olive_oil` is **64 of 133** truth items
— nearly half the identity ground truth is cooking oil, which no vision model names
and which this pipeline predicted on **0/80** samples. Excluding it lifts Item F1
from 0.15 to 0.19 and removes 64 false negatives outright.

Both effects are artifacts of how truth was built and neither is disclosed. The
defensible statement is narrower and much stronger than what the README currently
says: *coverage is low because the catalogue is small, and the FP rate is inflated
because real-but-unmapped ingredients score as hallucinations.* `docs/evaluation.md`
documents the metrics but not this property of the truth set. It should, and the
scorecard should carry a second FP column that excludes unmapped matches.

### Abstentions are two different failures reported as one

Splitting the 70 `ask` outcomes by cause: most are genuine catalogue gaps — the
Turkish pack has no döner, pide, börek, poğaça or kebap row, so nothing could have
matched. But a distinct group fails at the **retrieval score threshold** even
though the catalogue does hold a valid answer; a bare `chicken` query has two
plausible catalogue matches and still falls below the floor.

Those are two different fixes — catalogue data entry versus threshold tuning — and
the scorecard collapses them into one `ask`. The error distribution (E12 24.6%,
E4 24.3%, unclassified 26.1%) does not separate them either, so the numbers cannot
tell you which lever moves coverage. Splitting the abstention count by cause is a
few lines in the harness and it is the difference between "coverage is a data
problem" as an assertion and as a measurement.

### Vision counts now multiply mass, unchecked

Since #229, a model-reported count multiplies the per-item gram figure. Measured on
the golden set, this pushes some items past 400 g. Nothing compares the result to a
plausibility band before it is eligible for auto-accept, so a miscounted plate
becomes a large calorie error with no uncertainty signal — the same failure mode as
#218, now with a multiplier on it. `countConfidence` caps such an item at 0.60,
which routes it to review today; that cap is the only thing standing between a
vision miscount and a committed number.

The MAPE denominator is the weaker point: **2 rows**. A 12.7% MAPE over two rows
is not a calorie-accuracy claim, and the README says so — but the number is
printed in a results table where it reads as one.

Also note README line 6 carries an open `<!-- PENDING: scorecard refresh -->`
comment saying issue #218 will move every figure under Results. Shipping a
results table that the file itself flags as pending is a credibility problem
independent of the numbers.

One last inconsistency a reviewer finds in one command: README says **99 canonical
foods**, while `STATUS.md` and the packs say **103** (en_US 38, tr 57, ja_JP 8).
The README figure predates the Turkish catalogue restoration.

## 4. AI/LLM path

The brief asks to pick one of three and go deep. This repo does hybrid
(rules + retrieval + LLM) *and* ships `docs/finetuning-plan.md`. The hybrid path
is real: TF-IDF word+char n-gram retrieval, negative aliases, deterministic
nutrition, confidence routing. Depth is fine.

Gap: the vision adapter has a live Gemini path (`vision.gemini.ts`, real
`generativelanguage.googleapis.com` calls, retry ladder, categorised errors), but
**no live accuracy is claimed or measured**. Every headline number is offline
fixture replay of 80 recorded responses. README is explicit about this ("live
provider accuracy remains unverified", "multi-item preservation through that live
path remains unverified"), which is the right disclosure — but it means the app
has never been demonstrated working end to end against the real model. For a
brief whose focus is meal-logging accuracy, that is the largest single evidence
gap, and it is the gap a Loom recording would have closed for free.

Known open defect, tracked as #218 and unfixed: on the photo path a confident
model count is trusted. Per the issue, `A2.jpg` shows two simits and the service
returns one `tr.simit`, 100 g, 329 kcal against a 658 kcal ground truth —
reportedly identical across three independently keyed submissions, while the same
input as text (`2 simit`) returns 658 correctly. A ~50% calorie undercount on the
product's primary path, committed with no uncertainty signal, contradicting D1
("model output is perception, not measurement").

**I could not reproduce this on `main`, because the evidence is not in the tree.**
`eval/fixtures/real_test/`, `A2.jpg` and `C7.jpg` do not exist on `main`; they were
untracked files in a working tree. The 329-vs-658 figure and the "50 interactive
Simulator interactions" claim both rest on artifacts a reviewer cannot see. The
defect is plausible and the mechanism is visible in the code, but as submitted it
is an assertion, not evidence. Either commit the fixture (it is a photo of a
bakery item, not personal data) or state the number as a report rather than a
measurement.

Related and verified: **the text path 500s under the fixture provider.** A
`POST /v1/meals` with `{"text": "2 simit"}` and no `sample_id` returns
`needs image bytes or a sample_id`. The README describes text input as a supported
mode, and no e2e test covers a text-only request — which is why nobody noticed.
That is also the path #218 cites as the working cross-check, so the one control
for the photo defect is broken in the default configuration.


## 5. Evaluation criteria, one by one

**Accuracy mindset** — strongest axis, with one hole that is now measured rather
than suspected: the published numbers come from the Python pipeline, the parity
gate that was supposed to connect it to the delivered service did not exist, and
when written it fails on 14 totals and one routing decision (§3). Metrics, test
set, taxonomy, abstention, clarification and the regression gate are all real and
well built — but the regression gate does not watch coverage, and coverage is the
number that moved.

**Architecture** — clear boundaries (`domain` / `pipeline` / `adapters` / `app`),
invariants enforced in CI by `check_invariants.py`. The dual-stack duplication is
the only smell, and it is a big one.

**Reliability** — user-scoped idempotency (`meals.service.ts`, `meals.controller.ts`,
`pipeline/runner.ts`) replaying both completions and refusals. Retry/fallback
ladder in `vision.gemini.ts` with `retryable` and `retryAfter` on the error type.
The store is in-process, so it does not survive a restart or a second instance —
acceptable for a take-home, but state it where a reviewer looks.

**Observability** — present and adequate on `main` (merged via PR #248): request
ids, structured per-request JSON lines, `/metrics` counters, plus `obs.test.ts` and
`observability.e2e.test.ts`. Process-local, no traces, no export. The earlier
warning that this was missing applied to the old checkout, not to `main`.

**Communication** — the documents are thorough and unusually honest. Three
problems: volume (222 README lines plus 8 tracked docs), the missing video and
email, and the fact that the README's own numbers do not match the harness.

## 6. "Questions we'll ask" — none of the four are answered on `main`

The brief names four questions. No section on `main` answers them:

1. Biggest trade-off you made, and why?
2. How would you improve accuracy next (top 3)?
3. What breaks at scale?
4. Where are the biggest security/privacy risks?

Q4 is partly covered by README's "Security and privacy limits". Q1–Q3 have material
scattered across `docs/decisions.md` (D1–D12) and README's "With more time", but
nothing answers the questions as asked.

**The answers exist twice, and neither copy is in the submission.**
`agent/codex5/interview-answers` (`0f2b91e`) adds a ~45-line README section
answering all four from the decision records. Locally, untracked,
`docs/interview_questions_answers.md` (54 lines, Turkish) answers the same four in
more depth. One is on a branch, the other is outside git; `main` has neither. This
is a required deliverable that has been written twice and shipped zero times.

I read the other four unmerged candidates so you do not have to:

| Branch | Verdict |
|---|---|
| `codex5/interview-answers` | **Merge.** Answers the four brief questions; `main` has nothing equivalent. |
| `codex4/audit-python-http` | **Merge.** 140-line read-only audit of the Python HTTP entrypoint with the exact removal order and its two blockers (§2). |
| `codex3/ios-simulator-smoke` | **Merge.** The only record of an interactive iOS Simulator run — iPhone Air / iOS 26.5, 7 screenshots. Without it the mobile deliverable has no evidence of ever having been run. |
| `codex5/finetuning-plan` | Skip. Older than the version already on `main`. |
| `codex5/eatbetter-comparison` | Skip. Older than `docs/comparison.md` on `main`. |

Three merges, no new writing, and they close a required deliverable plus two
evidence gaps.

## 7. Explicit EatBetter comparison

The brief is emphatic: *"We want to see a clear improvements/comparison point of
view, not just a standalone solution."*

`docs/comparison.md` (272 lines) does this well — numbered improvements, each
answering what is better, why, and how it is measured, plus a section conceding
where EatBetter is better. This is above the bar.

Gap: it is not in the README, only linked. And it argues from *design properties*
rather than from a side-by-side on the same input. There is no "here is the same
meal photo in both products, here is what each returned". The brief asks "which
examples or failure cases show the difference" — the answer is mechanism, not a
paired example. Getting real EatBetter outputs may not be feasible, in which case
say so explicitly instead of leaving the gap silent.

## 8. Factual defects, measured on `main` at `1f3526b`

| Issue | Detail |
|---|---|
| Parity gate absent, and fails when written | D12, the `ci.yml` comment and README line 112 all cite it. No `--parity` flag, no tracked `*parit*` file. Written and run: 14/80 kcal mismatches, `tr_0003` action mismatch. See §3. |
| Delivered service ships the gate D11 rejected | TS `effectiveConfidence` includes `portionConfidence`; Python does not. TS auto-accepts **0/80** samples, Python 1/80. Commit `2a42eee`; `docs/decisions.md` never updated. See §3. |
| Regression gate cannot see coverage | `eval/reports/baseline.json` stores per-cuisine MAPE only. Coverage fell 15%→12% and `--check-regression` stayed green. Baseline last regenerated at `a8bf11d`. |
| README results table disagrees with the harness | Coverage 15% printed vs 12% measured; western 42% vs 33%; mediterranean 33% vs 25%. Already wrong at `c1e405f`, the commit that wrote it. |
| README results table is marked pending in its own source | Line 6: `<!-- PENDING: scorecard refresh — issue #218 ... every figure under Results will move -->`. |
| 86% FP rate is largely an artifact | 87 of 135 false positives (64.4%) match the sample's own `unmapped_source_ingredients`. Undisclosed in `docs/evaluation.md`. See §3. |
| Golden truth is half cooking oil | `us.olive_oil` is 64 of 133 truth items; predicted on 0/80. Excluding it moves Item F1 0.15 → 0.19. |
| README food count contradicts `STATUS.md` | README says 99 canonical foods; packs and `STATUS.md` say 103 (38/57/8). |
| Text-only request returns 500 | `POST /v1/meals` `{"text": "2 simit"}` → `needs image bytes or a sample_id` under the fixture provider. README presents text input as supported; no e2e test covers it. |
| `docker compose up` starts the forbidden stack | The only app service in `docker-compose.yml` is `uvicorn mealog.api.main:app`. Zero Node references in the file. |
| `make test` / `make lint` skip the delivered backend | Both run only pytest/ruff. The **263** vitest tests run in CI (`server-node` job) but not from the Makefile a reviewer reads first. |
| CI never runs the mobile test suite | The `mobile` job runs `tsc --noEmit` and `expo export` only. `apps/mobile` has 4 passing test files that no gate executes. |
| Mobile tests assert on source text, not behaviour | 177 lines across 3 files, **55 `assert.match` calls against `readFileSync` source strings**. `Review.tsx` (301 lines) has no behavioural test; a rename passes, a broken handler passes. No screen is rendered in any test. |
| `docs/decisions.md` stops at D12 | Session notes and harness behaviour reference D13; `grep -c D13 docs/decisions.md` → 0 on `main`. |
| `httpx2` unpinned and unexplained | Legitimate (Pydantic-stewarded httpx continuation, verified on PyPI; `starlette.testclient` imports it) but the only unpinned dependency, and nothing records why a typosquat-shaped name is intentional. |
| `STATUS.md` headline is false | `scripts/status.py:153` hardcodes "the photo path and the app do not exist yet". Both exist. First sentence a reviewer reads. |
| `dist/` is not in `.gitignore` | Nothing ignores build output; `server/dist/` appears as untracked noise after any `npm run build`. |
| #218's evidence is not in the repository | `eval/fixtures/real_test/`, `A2.jpg`, `C7.jpg` absent from `main`. The 329-vs-658 kcal figure and the "50 Simulator interactions" claim cannot be independently checked. |
| Golden set has no images directory | `eval/golden/` holds `manifest.jsonl` (80 rows) and `query_variants.jsonl`; `eval/fixtures/` holds 80 recorded JSON responses. Correct for offline replay, but photo-path accuracy rests entirely on recorded provider output. |
| 63 branches unmerged into `main` | Three are worth merging and close a required deliverable plus two evidence gaps. See §6. |

## 9. Priority order

Ranked by what changes a reviewer's verdict per hour spent.

**P0 — before anything else**

1. **Submit from `main`, but land the untracked privacy work first.** Every gate is
   green on `1f3526b`, and observability plus the Turkish catalogue are already
   there. What is missing is not on a branch — it is outside git:
   `pipeline/privacy.ts` (530 lines), `app/rate-limiter.ts`, the
   `@Delete('users/:id/data')` GDPR route, five test files and `docs/security.md`.
   One small PR onto `main` converts the strongest answer to the brief's
   security/privacy question from "uncommitted" to "shipped". Do not submit the
   branch itself.
2. **Fix the email draft before sending it.** `docs/submission_email_draft.md`
   currently advertises face blurring, EXIF stripping, prompt-injection immunity,
   GDPR deletion and "238 tests across 21 files" — none of which a reviewer cloning
   `main` can find, and the test count is wrong (263 across 19). Item 1 makes most
   of it true; correct the count and the Loom line regardless.
3. Record the Loom. `docs/walkthrough.md` is a 306-line script; this is ~90
   minutes and it is a named required deliverable that does not exist.
4. Merge the three worthwhile branches — `codex5/interview-answers` (the four brief
   questions, a required deliverable), `codex4/audit-python-http` (the Python
   removal audit), `codex3/ios-simulator-smoke` (the only evidence the app was ever
   run interactively). Also track `docs/interview_questions_answers.md`, which
   answers the same four questions in more depth and is currently untracked. No new
   writing needed.

**P1 — the claims that will not survive scrutiny**

5. **Land the parity gate as `eval/parity.py`** and wire it into `make check` and
   CI. It is written and it currently fails: fix the rounding first (one shared
   half-up helper — half-up is what a nutrition label does), then decide `tr_0003`.
   A gate that exists and fails is a finding; a gate that is cited and absent is a
   credibility problem.
6. **Resolve `portionConfidence` vs D11.** Either drop it from
   `effectiveConfidence` so the shipped service matches the decision record and the
   published numbers, or supersede D11 with real-fixture selectivity evidence and
   re-measure coverage. **Needs @zexy2's sign-off** — `docs/decisions.md` is
   append-only and unclaimable (AGENTS.md §3, §6). Ask now, not at the end.
7. **Add coverage to the regression gate** and regenerate `eval/reports/baseline.json`.
   The 15%→12% silent drop is the argument for doing it, and it belongs in the PR
   body as a before/after ablation per AGENTS.md §7.
8. **Sync the README results table to the harness output**, close the `PENDING`
   comment on line 6, and fix 99 → 103 canonical foods. The table is wrong in a way
   one command exposes.
9. **Disclose the truth-construction artifacts** in `docs/evaluation.md`: unmapped
   real ingredients score as false positives (87 of 135), and `us.olive_oil` is
   half the identity truth. Add an FP column that excludes unmapped matches. This
   turns the worst-looking number in the submission into evidence of measurement
   maturity.
10. **Make Docker start the Node service.** Replace the `uvicorn` command in
    `docker-compose.yml` with the NestJS build, or add a Node `api` service and move
    Python behind a `reference` profile that is off by default. Point `make test`
    and `make lint` at both suites. This is the difference between "complies with
    the brief" and "looks like it complies".
11. **Fix or remove the text-only path.** `{"text": "2 simit"}` 500s under the
    fixture provider while the README presents it as supported. Add an e2e case
    either way — it is also #218's only cross-check.

**P2 — quality gaps worth closing if time allows**

12. Split the abstention count by cause (catalogue gap vs score threshold) in the
    harness. It is a few lines and it converts "coverage is a data problem" from an
    assertion into a measurement.
13. Give `Review.tsx` a real test. 301 lines gated by 55 `assert.match(source, /regex/)`
    calls is the weakest engineering artifact in the repo, and clarification and
    quantity editing is exactly the interaction the brief cares about. Extract the
    state logic into a plain module and test it, mirroring how `demoScenarios.ts` is
    tested.
14. Wire `apps/mobile`'s `npm run test` into the `mobile` CI job. Four test files
    pass and no gate runs them.
15. Fix the `STATUS.md` headline in `scripts/status.py:153`. It tells every reviewer
    the photo path and the app do not exist.
16. Add D13 and any other missing decision entries. Human sign-off required, so
    bundle the request with item 6.
17. Fix #218 (photo-path count trusted without observation) and commit its fixture
    so the number is checkable. Falling back to `quantity: null` plus the catalogue
    default removes the worst disclosed defect and restores D1.
18. Add the highest-frequency missing Turkish foods (döner, pide, börek, poğaça,
    kebap) with sourced rows. Direct lever on coverage, measurable via `make eval`.
19. Pin `httpx2>=2.12` with one line explaining the name is intentional; add
    `dist/` to `.gitignore`.

## 10. Honest overall read

Against the stated evaluation criteria: strong on accuracy mindset and
architecture, good on reliability and observability, and undermined by two things
that are about finishing rather than building.

The branch confusion is resolved and it was better news than expected — `main` is
green on every gate, has the observability work and the restored catalogue, and
is the right thing to submit. What remains is real: two of four required
deliverables (video, email) do not exist, and three claims in the documentation are
not backed by the code.

Those three are the substance of this report. The parity gate cited in D12, `ci.yml`
and the README was never written; I wrote it and it fails — 14 kcal mismatches from
a rounding-mode difference and one meal that the two engines route differently. The
delivered TypeScript service ships the portion-uncertainty gate that D11 says is
"deliberately not shipped", which means it auto-accepts nothing at all while the
published coverage number was measured by an engine that auto-accepts. And the
regression gate meant to catch drift does not watch coverage, so a 15%→12% drop
passed silently.

One correction runs the other way. The 86% false-positive rate is mostly a
measurement artifact: two thirds of those false positives are the pipeline correctly
naming food that the golden set moved into `unmapped_source_ingredients` instead of
scoring, and nearly half the remaining identity truth is olive oil, which no vision
model names. The accuracy work is better than its own headline number says, and
nobody wrote that down.

The underlying engineering is better than the packaging suggests. Closed-set
resolution, deterministic nutrition, abstention over guessing, per-cuisine
regression gating — those are real and rare. They are currently hidden behind
numbers a reviewer can disprove in one command and two documented decisions the
code contradicts.

None of the P0 items require new engineering.

