# Decision log

Format: decision → rejected alternative → constraint → cost.

---

## D1 — The model never produces a nutrient number

**Decision.** The vision/LLM stage returns observed items only. Resolution picks a
`food_id` from a closed candidate set produced by retrieval, or returns `ABSTAIN`.
Nutrition is computed by a pure function over the canonical catalogue.

**Rejected.** Ask the model for calories directly (shipped as the `V0` baseline so
the cost of the alternative is measured rather than asserted).

**Constraint.** The brief's core problem is *canonical* foods. Canonicality requires
an ID space the model cannot invent.

**Cost.** Recall is capped by catalogue coverage: a food that is not in a locale pack
cannot be logged, only abstained on. Mitigated by the ask-flow and a
"suggest a new food" path. This is a real limitation, not a rounding error —
`E3` (hallucination) is traded for `E4` (miss), and a miss is the cheaper error
because the user can see it.

---

## D2 — A locale is a data pack, not code

**Decision.** Each market is a directory: `foods.jsonl`, `aliases.jsonl`,
`units.jsonl`, `text_rules.yaml`, `pack.yaml` (with a **license** field). Nothing
in `server/src` references a locale by name. Three packs ship (`en_US`, `tr`,
`ja_JP`) plus `scripts/build_locale_pack.py`.

**Rejected.** One global catalogue with per-market special cases.

**Constraint.** The company is expanding beyond its current market. What matters is
not "does it know Turkish food" but "what does market N+1 cost". Three packs exist
because an abstraction with one implementation is ceremony; with three it is a seam.

**Cost.** Duplication across packs (rice appears in all three with different IDs and
different source values). Accepted: per-market provenance and licensing beat
deduplication, because the packs have different legal terms. `tr` uses TURKOMP,
which carries commercial-use restrictions — recorded in `pack.yaml` rather than
discovered later.

---

## D3 — Headline metric is the worst cuisine, and accuracy is read with coverage

**Decision.** The scorecard leads with worst-bucket MAPE and the worst-to-best
spread. Calorie error is computed over **covered** samples only, with coverage
reported beside it. CI fails if *any* cuisine bucket regresses.

**Rejected.** A single aggregate MAPE.

**Constraint.** Averaging hides distribution shift, which is the exact failure this
project targets. And scoring a deferred meal as a zero-calorie answer punishes the
system for correctly declining to guess — the first harness run did precisely that
and inverted V3's result, which is why the harness was built before the model.

**Cost.** More numbers to read, and small per-bucket `n` means wide intervals.
Reported honestly rather than smoothed away.

---

## D4 — Offline-reproducible evaluation via recorded fixtures

**Decision.** `make eval` replays recorded provider responses. No key, no network,
no spend. `make eval-live` hits the real provider and re-records.

**Rejected.** Require an API key to reproduce results.

**Constraint.** The most common take-home failure is "the reviewer could not run
it", and the most common criticism of AI submissions is unverifiable numbers. This
closes both with one mechanism.

**Cost.** Fixtures drift from the live provider. Mitigated by stamping every fixture
with provider and `prompt_version`, and re-recording whenever either changes.

---

<!-- TODO(Sun/Mon): D5 retrieval fusion · D6 portion as distribution
     · D7 fine-tune scope · D8 mobile stack -->

## D5 — Photo ingress uses bounded multipart and content-hash fixture keys

**Decision.** `POST /v1/meals` accepts `multipart/form-data` with an `image`
part, validates an allow-list of image MIME types, and caps the image at 10 MiB.
The request body is held in memory only for the provider call; the application
does not persist the photograph. `VisionPort` receives a `VisionInput`; fixture
replay keys image inputs by SHA-256 and retains `sample_id` only as a fixture-
provider compatibility path.

**Rejected.** Base64 JSON would avoid a multipart parser but expands every image
by roughly one third and makes the mobile upload path less suitable. A
pre-signed object URL would avoid keeping bytes in the API process but requires
an object store, expiry policy and cleanup worker that do not exist in this
take-home.

**Constraint.** The photo path must be a real input boundary before a mobile
client is built, while D4 requires offline fixture replay with no image upload
or provider key.

**Cost.** Multipart adds one runtime dependency and the API process briefly
holds image bytes. Provider-side retention and processing are governed by the
provider's terms; this repository records only validated observations, never
the photograph or response envelope.
