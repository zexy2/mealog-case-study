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

---

## D6 — Retrieval scores coverage, not similarity

**Decision.** Two signals over the same documents — word 1–2 grams and character
3–5 grams — blended by weight, each scored as **IDF-weighted asymmetric
coverage**: *how much of what the user said is accounted for by this food's
surface forms, weighted by how distinctive each piece is.* Exact surface hits
outrank fuzzy ones. A known confusion surfaces its target capped below the
accept threshold, so the resolver abstains and the gate asks.

**Rejected.** *BM25* — canonical food names are 2–6 tokens, so document-length
normalisation has nothing to normalise, and it costs a dependency. *Reciprocal
Rank Fusion* — it exists to merge ranked lists whose scores are not comparable;
both signals here are already comparable on the same documents, and RRF would
leave a rank-derived number `resolve.py` could no longer threshold as a
confidence. *Cosine similarity* — symmetric, so a short query is penalised for
everything an alias-rich document contains that the user did not say. `pilav`
scored 0.28 against `sade pirinc pilavi` purely because the document was longer;
ranking survived that, the accept threshold did not.

**Constraint.** `resolve.py` thresholds on the absolute score, so the score has
to stay readable as a confidence. Turkish and Japanese make inflection and
transliteration the common case rather than the edge case.

**Cost.** Coverage is not a similarity: two foods can both score high on a short
ambiguous query. That is genuine ambiguity, handed to the margin rule instead of
resolved silently. And unseen n-grams must be charged at maximum IDF or a
foreign dish scores against a local one — `pizza margherita` matched a Turkish
rice dish at 0.55 before that correction, because every n-gram that made it
*pizza* had been silently dropped by the vectoriser.

---

## D7 — Portion is a distribution, and density belongs to the food

**Decision.** Portion returns `(grams, p10, p90)`. Interval width is graded by
evidence: a stated quantity with a known unit is narrow, an assumed quantity
falls back to the catalogue-default band, and an unknown density widens further
around a declared midpoint. **Volume units carry volume only.**

**Rejected.** *A point estimate* — mass error dominates calorie error, and both
the confidence gate and the UI need the width. *Density on the unit* — tried and
reverted within the same pull request. A cup is not made of rice; borrowing one
food's density made every other food measured in cups **worse** than the 1 g/ml
assumption it replaced.

**Constraint.** Our own taxonomy names `E8` (unit/density error) and the code was
committing it. A guess must never be presented with the confidence of a
measurement.

**Cost.** Every volume unit currently falls to the unknown-density band
(0.45–1.75), which is wide. Once the gate reads the interval, coverage drops on
volume-measured meals — that is the system telling the truth, not a regression.
The fix is `density_g_per_ml` on `CanonicalFood`, which narrows the band with
evidence rather than with optimism.

---

## D8 — One component fine-tuned, one specified and not trained

**Decision.** The frontier VLM is **rented, not fine-tuned**. The component we
train is a locale adapter that aligns images into the canonical food embedding
space, on a mixed multi-cuisine corpus, reported per cuisine. A mass regressor on
Nutrition5k is **specified in full and not trained**.

**Rejected.** Fine-tuning the frontier VLM for general food recognition.
Published benchmarking on Nutrition5k puts Gemini 3.0 Flash at 80.7 kcal MAE /
CCC 0.767, and finds that low-data fine-tuning on strong base models yields
limited gains without large, high-quality corpora. In six days that produces a
model that loses to the baseline and a story about trying.

**Constraint.** The brief marks fine-tuning implementation optional and asks
which path was chosen and why. Measuring *where* the frontier is weak has to come
before training anything: identification is adequate, mass is not, and local
cuisine is not.

**Cost.** **Nothing is trained yet** — see `STATUS.md`. This entry records a
decision, not a result, and it is being misread the moment it is taken for one.
The same published work found that human annotators corrected label omissions in
Nutrition5k and moved measured ingredient overlap from 0.62 to 0.82, so a naive
fine-tune on those labels would learn the dataset's errors and report them as
accuracy.

---

## D9 — Mobile is Expo / React Native, demoable without a key

**Decision.** Expo + React Native + TypeScript. Three screens. Fully demoable
against recorded fixtures with `VISION_PROVIDER=fixture`.

**Rejected.** *Native* — two codebases in six days. *Flutter* — no advantage
here and further from the stack this team most likely runs. *A web app* — the
brief calls that a format violation, not a shortcut.

**Constraint.** A reviewer has to be able to run it. A QR code and Expo Go is the
shortest path from clone to a phone, and "could not run it" is the most common
reason a take-home is rejected. The demo also cannot depend on an API key,
because D4 already promises the numbers reproduce without one.

**Cost.** Expo Go constrains native modules. Nothing this app needs sits outside
it — camera and multipart upload are both covered — but if that ever changes,
EAS build is the escape hatch and it is slower.
