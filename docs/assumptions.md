# Assumptions

The brief is unusually complete: it specifies deliverables, deadline, focus, evaluation
criteria, tool policy, and even the questions that will be asked at review. I did not
send clarifying questions. Where the brief was silent I made a call — each one is below
with the evidence behind it and what it would cost to reverse.

Format: **ambiguity → what I checked → decision → reversal cost.**

---

## A1 — "Implement an end-to-end flow" does not define a scope

**Checked.** The brief also says *"You can start from any scope you can finish"* and
*"If time is limited, show strong problem analysis, solution analysis, and future
improvements."* Those two lines resolve the ambiguity in favour of depth over breadth.

**Decision.** One narrow slice end to end — photo and free text in, canonical foods,
portions and nutrition out, three mobile screens — plus an evaluation harness that is
treated as the primary artifact rather than a supporting one. Anything that could not
move an accuracy number was cut and listed under *With more time*.

**Reversal cost.** Low. Pipeline stages are independent modules; adding an input mode or
a screen does not touch the measurement path.

---

## A2 — Which market should the evaluation set represent?

**Checked.** The public footprint indicates usage skews heavily toward one market.
Independent re-analysis of photo-based dietary assessment finds evaluation sets are
~62% Western, and that within-app error varies **1.6–2.4x across cuisines**. So a single
aggregate accuracy number is not meaningful for a product entering new markets.

**Decision.** Neither a locally-weighted set nor a generic global one. The golden set is
stratified across six cuisine buckets (reusing a published coding scheme so the numbers
stay comparable), the headline metric is the **worst-performing bucket** rather than the
mean, and `en_US` acts as a no-regression guard enforced in CI.

Turkish is the deepest stratum for exactly one reason: it is the market where I can
produce Tier 2 kitchen-scale ground truth myself. That is a **label-quality** reason, not
a product-priority one, and the distinction is deliberate — optimising for the market
that is easiest to label is the bias this project exists to measure.

**Reversal cost.** None. Market weighting is a sampling choice in
`eval/golden/manifest.jsonl`. No locale-specific behaviour exists in the pipeline, and
`scripts/check_invariants.py` fails the build if any appears.

---

## A3 — May the system ask the user, or must every log be silent?

This one mattered. A meaningful share of the accuracy gain comes from abstention — saying
*"I am not sure"* instead of committing to a wrong number. That trades a little friction
against a lot of invisible error, and the product's positioning is explicitly
low-friction (*"no tedious logging, just scan"*).

**Checked.** The product already answers it. Release notes from v2.0.6 onward describe a
confirmation step — *"Betty does the rest, you just tap to confirm"* — and public reviews
describe correction as routine: *"Sometimes the portions are a bit off but editing them
is quick. Still way less friction than traditional food logging apps."*

**Decision.** An occasional targeted question is consistent with the existing UX, so
confidence gating stays — tuned conservatively. High confidence auto-accepts; the middle
band shows inline alternatives; low confidence asks **one** question, never a form.
Coverage and accuracy are reported as separate numbers so the threshold is a product dial
rather than a baked-in opinion.

**Reversal cost.** Two constants. `AUTO_ACCEPT` and `ASK_BELOW` in
`pipeline/confidence.py`; the risk–coverage curve shows what each setting buys.

---

## A4 — Which AI path counts as "one, gone deep"

**Checked.** The brief offers prompt design, hybrid, or a fine-tuning plan, and asks for
one. It also notes fine-tuning implementation is optional.

**Decision.** **Hybrid** is the chosen path. Fine-tuning is not treated as a second path
but as how one component of the hybrid improves — the retrieval/locale layer, where the
gain is measurable on a free tier. The vision mass-estimation model is specified in full
in `docs/finetuning-plan.md` and deliberately not trained; the reasoning, including the
published baselines it would have to beat and the label-noise risk, is in that document.

**Reversal cost.** n/a — but note the framing matters: this is one path with a tool
applied inside it, not three paths attempted shallowly.

---

## A5 — Deploy, or run locally?

**Checked.** The brief accepts either.

**Decision.** The reproducible reference path is local. `make eval` reproduces the
published scorecard **fully offline** from recorded fixtures — no API key, no network,
no spend — and the Node/Nest edge can be run locally for the mobile contract. A live
iOS smoke run is recorded separately in [PR #191](https://github.com/zexy2/mealog-case-study/pull/191)
with `EXPO_PUBLIC_DEMO_MODE=false`; it is runtime evidence, not proof of a hosted
deployment. No deployed URL or deployment claim is part of this submission.

**Reversal cost.** None.

---

## A6 — When the three-day clock starts

**Decision.** The brief gives a **three-day deadline**. I keep the schedule
brief-relative rather than hardcoding a calendar date that could contradict the
submission context.

**Reversal cost.** n/a. Recorded so the assumption is visible rather than implied.

---

## A7 — AI tool usage

**Checked.** The brief: *"Anything is allowed (including AI tools). Just be explicit
about what you used and why."*

**Decision.** AI used throughout, disclosed specifically — not summarised — in the
README's AI usage section, including the places where model output was wrong and how it
was caught. Every line is mine to defend.

## A8 — Photo ingress is bounded and application-side retention is zero

**Checked.** The API originally accepted only a fixture `sample_id`; the mobile
client therefore had no photograph contract. A real upload needs content-type
validation, a hard size limit and a clear retention boundary before a client is
built.

**Decision.** Accept one `multipart/form-data` `image` part, allow only common
image MIME types, reject images over 10 MiB, and validate content signatures for
JPEG/JPG, PNG, GIF, WebP, AVIF, HEIC, and HEIF before transport. MIME spoofing is
rejected at the Nest edge and checked again by the Gemini adapter. Keep bytes in
memory only for the provider call; the adapter clears its strong request-input
reference in `finally`, while fixture recording keeps only a weak identity
reference. Recorded fixtures contain provider metadata and validated observed
items, not the image or raw response envelope. Image fixture lookup is by
SHA-256 content hash.

**Reversal cost.** Moderate. A pre-signed object-store flow can replace the
multipart endpoint later, but needs upload expiry, cleanup and provider-fetch
behaviour. Provider-side retention remains governed by its own terms and is not
controlled by this application.

## A9 — What the current live boundary proves

**Checked.** The current edge is Node.js/TypeScript: NestJS owns `POST /v1/meals`,
multipart validation, item correction, and the health endpoint; the framework-free
pipeline remains the computation boundary. PR #191's fresh-main iOS Simulator/Expo
Go retest ran four selected gallery flows against Node Gemini: rice resolved to
`tr.pilav`, simit plus ayran returned as two resolved items, the repeat was stable,
and lahmacun remained `ABSTAIN`. It did not rerun all twelve images, and no key or
photo entered the repository.

**Decision.** Call the fixture path **demo/offline**, and call PR #191 a
**live-provider runtime smoke**. Do not call either a hosted deployment proof,
broad live-provider accuracy result, or completed live multi-item acceptance gate.
The simit-plus-ayran image proves that one run returned two items; it does not prove
that Gemini visually counted two simits. PR #194 proves explicit text quantity
preservation, not reliable visual counting. Unknown provider quantity stays unknown
and routes to review; no count is fabricated from pixels or grams. The smoke's
lahmacun abstention is a conservative false reject, not a reason to widen acceptance.

PR #196 adds item-scoped clarification and correction: catalogue-backed count,
identity, or portion choices can be submitted to `POST /v1/meals/correct`; the
server re-grounds the changed item, recomputes portion and nutrition, and preserves
untouched items. PR #199 propagates degraded provider results end to end and forces
`review` before any auto-accept or correction route. A degraded result is never
auto-accepted.

**Operational limits.** The current idempotency maps are process-local and in-memory:
restart or multiple instances lose the cache. `X-User-Id` is optional and defaults to
`demo-user`; it scopes the reference cache but is not authentication. The health
endpoint is liveness only. The Gemini adapter exposes an injectable event hook and
bounded retry/fallback metadata, but the edge does not yet provide durable request
traces, metrics, or a production observability backend. These are known reference
implementation limits, not deployment guarantees. The current live smoke did not
encounter a degraded/retry response; the rule above is verified by focused adapter,
pipeline, API, and mobile tests, not by that smoke.
