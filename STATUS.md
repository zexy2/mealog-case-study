# Status

> **Generated file — do not edit.** Produced by `python scripts/status.py`
> from the working tree, and checked in CI. It cannot quietly go stale the
> way a hand-written status section does.

## Is this ready to submit?

**No.** 8 of 8 deliverables are still outstanding. What exists today is the measurement layer and the architecture; the photo path and the app do not exist yet.

## Deliverables

| Deliverable | State | Evidence |
|---|---|---|
| Mobile app experience (not a web app) | ⬜ not started | no app project in the tree |
| Photo ingest (end-to-end flow) | 🚧 partial | API accepts `sample_id` (a fixture id), not a photograph — [#6](../../issues/6) |
| Real vision provider | ⬜ not started | `vision_gemini.perceive()` raises NotImplementedError — [#3](../../issues/3) |
| Accuracy evaluation (metrics, test set, taxonomy) | 🚧 partial | harness runs offline; 9 golden samples, 9/9 fixtures still synthetic — [#3](../../issues/3), [#2](../../issues/2) |
| Fine-tuning | 🚧 partial | plan in `docs/finetuning-plan.md`; nothing trained (the brief marks implementation optional) |
| Technical write-up | 🚧 partial | README + 5 documents; 4 section group(s) still TODO |
| Loom walkthrough | ⬜ not started | recorded after code freeze |
| Email summary | ⬜ not started | sent with the submission |

## Read the numbers with this in mind

**9 of 9 recorded fixtures are seeded placeholders**, flagged in each file with `"_synthetic": true`.

Nothing in `eval/reports/` is yet a claim about how accurately this
system reads a real plate. The harness, the metrics and the per-cuisine
breakdown are real and reproducible; the inputs they run on are not.
That changes when [#3](../../issues/3) records real provider responses
and [#2](../../issues/2) grows the golden set.

## Measured

| | |
|---|---:|
| Test functions | 22 |
| Locale packs | 3 (en_US, ja_JP, tr) |
| Canonical foods | 24 |
| Golden-set samples | 9 |

## Order of work

1. [#6](../../issues/6) API photo contract — **before** the mobile client,
   so the client is never written against a shape that has to change
2. [#3](../../issues/3) real vision provider, recording real fixtures
3. [#2](../../issues/2) grow the golden set → the first honest scorecard
4. [#7](../../issues/7) portion density, and [#5](../../issues/5) confidence
   accounting for portion uncertainty
5. Mobile screens
6. Write-up, walkthrough, submission

[#8](../../issues/8) (restricted-licence enforcement) is real, and is the
first item cut if the schedule slips.
