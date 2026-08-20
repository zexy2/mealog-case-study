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

**Decision.** Both, because the real failure mode is a reviewer who cannot run the
project. `make eval` reproduces the published scorecard **fully offline** from recorded
fixtures — no API key, no network, no spend — so every number in the README can be
re-derived independently. The backend is additionally deployed so the mobile app runs
from a QR code with no local setup.

**Reversal cost.** None.

---

## A6 — When the seven-day clock starts

**Decision.** Working to **Wednesday 26 August 2026** for the full submission.

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
image MIME types, reject images over 10 MiB, and keep bytes in memory only for
the provider call. Recorded fixtures contain provider metadata and validated
observed items, not the image or raw response envelope. Image fixture lookup is
by SHA-256 content hash.

**Reversal cost.** Moderate. A pre-signed object-store flow can replace the
multipart endpoint later, but needs upload expiry, cleanup and provider-fetch
behaviour. Provider-side retention remains governed by its own terms and is not
controlled by this application.
