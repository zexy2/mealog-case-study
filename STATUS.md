# Status

> **Generated file — do not edit.** Produced by `python scripts/status.py`
> from the working tree, and checked in CI. It cannot quietly go stale the
> way a hand-written status section does.

## Is this ready to submit?

**No.** 7 of 8 deliverables are still outstanding. What exists today is the measurement layer and the architecture; the photo path and the app do not exist yet.

## Deliverables

| Deliverable | State | Evidence |
|---|---|---|
| Mobile app experience (not a web app) | 🚧 partial | Expo app present; CI typechecks and bundles it; running on a device is shown in the walkthrough, not provable from the repository |
| Photo ingest (end-to-end flow) | 🚧 partial | API accepts an image; the path has not run against a live provider |
| Real vision provider | ✅ working | 25 recorded non-synthetic provider response(s) |
| Accuracy evaluation (metrics, test set, taxonomy) | 🚧 partial | harness runs offline; 25 golden samples, 0/25 fixtures still synthetic |
| Fine-tuning | 🚧 partial | plan in `docs/finetuning-plan.md`; nothing trained (the brief marks implementation optional) |
| Technical write-up | 🚧 partial | README + 6 documents; 1 section group(s) still TODO |
| Loom walkthrough | ⬜ not started | recorded after code freeze |
| Email summary | ⬜ not started | sent with the submission |

## Measured

| | |
|---|---:|
| Locale packs | 3 (en_US, ja_JP, tr) |
| Canonical foods | 24 |
| Golden-set samples | 25 |

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
