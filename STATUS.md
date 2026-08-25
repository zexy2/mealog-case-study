# Status

> **Generated file — do not edit.** Produced by `python scripts/status.py`
> from the working tree, and checked in CI. It cannot quietly go stale the
> way a hand-written status section does.

## Is this ready to submit?

**No.** 4 of 8 deliverables are pending (Mobile app experience (not a web app), Fine-tuning, Loom walkthrough, Email summary). The core photo pipeline, mobile application, security layers, and evaluation harness are fully operational.

## Deliverables

| Deliverable | State | Evidence |
|---|---|---|
| Mobile app experience (not a web app) | 🚧 partial | Expo app present; CI typechecks and bundles it; running on a device is shown in the walkthrough, not provable from the repository |
| Photo ingest (end-to-end flow) | ✅ working | API accepts an image; multipart photo-ingest path verified |
| Real vision provider | ✅ working | 80 recorded non-synthetic provider response(s) |
| Accuracy evaluation (metrics, test set, taxonomy) | ✅ working | harness runs offline; 80 golden samples, 0/80 fixtures still synthetic |
| Fine-tuning | 🚧 partial | plan in `docs/finetuning-plan.md`; nothing trained (the brief marks implementation optional) |
| Technical write-up | ✅ working | README + 12 documents; 0 section group(s) still TODO |
| Loom walkthrough | ⬜ not started | recorded after code freeze |
| Email summary | ⬜ not started | sent with the submission |

## Measured

| | |
|---|---:|
| Locale packs | 3 (en_US, ja_JP, tr) |
| Canonical foods | 103 |
| Golden-set samples | 80 |

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
