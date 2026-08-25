# Case Study submission email draft

> **Pre-send checklist:** verify the Loom link in a private window, confirm
> repository access for the reviewers, and confirm the previously
> exposed provider credential has been revoked. Hosted CI is currently blocked
> before execution; preserve the disclosure below unless a later run is green.

**To:** `hello@eatbetter.app`  
**Subject:** Full Stack Developer Case Study Submission — mealog / Zeki  

---

Hi EatBetter Team,

I am excited to submit my take-home case study for the Full Stack Developer role. 

Below is a concise summary of what was built, key trade-offs, known boundaries, and next steps.

---

### 🔗 Submission Links
* **GitHub Repository:** https://github.com/zexy2/mealog-case-study
* **Loom Walkthrough Video (9:07):** https://www.loom.com/share/8a1ad6fea24e401eaf52788d72d5a0fd
* **Architecture Decisions (D1–D20):** [docs/decisions.md](https://github.com/zexy2/mealog-case-study/blob/main/docs/decisions.md)
* **Correction Telemetry & Proposed HITL Loop:** [docs/data_flywheel_and_hitl_architecture.md](https://github.com/zexy2/mealog-case-study/blob/main/docs/data_flywheel_and_hitl_architecture.md)
* **EatBetter Comparison & Benchmark:** [docs/comparison.md](https://github.com/zexy2/mealog-case-study/blob/main/docs/comparison.md)

---

### 🛠️ What Was Built
1. **Node.js / TypeScript Backend (NestJS):**
   - **Grounded Closed-Set Resolution (D1):** The model perceives food descriptions while authoritative nutrition is computed deterministically from verified regional composition data (TÜRKOMP / USDA) across 103 canonical foods.
   - **Explicit Unverified Fallback (D19/D20):** After a catalogue miss, a separate bounded Gemini lane may prepare calorie/macro ranges and assumptions for up to 20 unresolved items. It is visibly labelled `llm_unverified_estimate`, is never auto-accepted, requires explicit user acceptance, and is excluded from grounded evaluation.
   - **Portion Uncertainty Intervals:** Returns explicit `grams_p10`–`grams_p90` bounds alongside provenance data rather than a hidden point estimate.
   - **Confidence Routing:** Routes items to `auto_accept`, `review`, or `ask` (safe deferral, including explicit `ABSTAIN`) with localized Turkish/English clarification questions.
   - **Security & Privacy (D4, D5, D13, D14):** Zero persistent photo storage (ephemeral in-memory processing only), binary EXIF/GPS stripping, PII text redaction, rate limiting, and prompt-injection defense.
   - **Correction Telemetry Prototype:** Best-effort candidate/portion events are PII-redacted, request-key hashed, and synchronously appended to a process-local JSONL store for operator review; write failure does not fail the user request. No automatic training, dietitian portal, shadow traffic, or model promotion is claimed.

2. **Mobile App (React Native / Expo):**
   - Implements Capture, Review, Day, and Abstention screens.
   - Supports interactive candidate selection ("Seç & Kaydet"), inline item editing/deletion, and dynamic portion adjustments.
   - Enforces count clarification answering before saving to Day, and infers correct HEIC/PNG/JPEG MIME types on iOS gallery uploads.
   - Current demo and live-provider paths were exercised on iOS Simulator; iOS and Android bundle exports pass. An earlier physical-iPhone Expo Go check covered only SDK 54 shell/camera compatibility, not current-flow E2E.

3. **Testing & CI Quality Gates:**
   - **313 Node.js / Vitest tests across 26 files** covering edge controllers, adapters, rate limiter, telemetry privacy, and the privacy pipeline.
   - **Offline Python parity and regression suite** for reference normalization, retrieval, and nutrition arithmetic.
   - **80 recorded golden-set fixtures** with a local `make check` regression guard; the same guard is configured in GitHub Actions, whose current run still requires the billing blocker to be cleared.

---

### ⚠️ Key Trade-Offs & Boundaries
* **Precision over Recall:** The grounded replay commits 10/80 samples and routes 70/80 to `ask`. `ask` includes explicit `ABSTAIN` plus other safe deferrals; it must not be reported as 70 catalogue misses.
* **Process-Local Idempotency:** The MVP uses an in-memory idempotency cache suitable for single-instance review; production scaling requires distributed Redis locks.
* **Client-Device Scoped Auth:** Authentication in this take-home demo is bounded by client device ID / `X-User-Id` header for isolation rather than signed OAuth/JWT tokens.
* **Evaluation Scope:** Focused on reproducible offline golden evaluation rather than unconstrained live API spend.
* **Estimate-Lane Risk:** Model-generated fallback ranges can still be wrong, especially for cooking fat, recipe, and visual portion. They are a weaker product option, not verified nutrition or evidence that grounded accuracy improved.
* **Mobile Preview Duplication:** Review currently recalculates edited preview totals from a duplicated client catalogue map. The server-grounded path remains authoritative, but this client arithmetic should be removed in favor of rendering `POST /v1/meals/correct` responses only.
* **Hosted CI Blocker:** The current GitHub Actions jobs are configured but were blocked before executing by the repository account's billing/spending state. I do not present local checks as hosted-CI evidence; the commands and current limitation are documented in the README.

---

### 🚀 Top Next Steps
1. **Curated Catalogue Expansion:** Add foods only after licence review, canonical mapping, and nutrition-source verification; telemetry suggestions remain evidence, not labels.
2. **Multimodal Embeddings:** Hybrid visual retrieval (CLIP embeddings + BM25 text) for higher visual recall on complex multi-dish platters.
3. **Interactive Multi-Item Bounding Boxes:** User-tap segment correction for multi-item plates.

Thank you for reviewing my case study. I look forward to your feedback and discussing the architecture in the next round!

Best regards,  
**Zeki**
