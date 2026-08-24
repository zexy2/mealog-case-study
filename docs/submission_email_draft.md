# Case Study Submission Email Draft ✉️

**To:** `hello@eatbetter.app`  
**Subject:** Full Stack Developer Case Study Submission — mealog / Zeki  

---

Hi EatBetter Team,

I am excited to submit my take-home case study for the Full Stack Developer role. 

Below is a concise summary of what was built, key trade-offs, known boundaries, and next steps.

---

### 🔗 Submission Links
* **GitHub Repository:** https://github.com/zexy2/mealog-case-study
* **Loom Walkthrough Video (5–10 min):** [Loom Video Link Here]
* **Architecture Decisions (D1–D13):** [docs/decisions.md](https://github.com/zexy2/mealog-case-study/blob/main/docs/decisions.md)
* **EatBetter Comparison & Benchmark:** [CASE-STUDY-GAP-REPORT.md](https://github.com/zexy2/mealog-case-study/blob/main/CASE-STUDY-GAP-REPORT.md) & [docs/comparison.md](https://github.com/zexy2/mealog-case-study/blob/main/docs/comparison.md)
* **Interview Questions & Direct Answers:** [docs/interview_questions_answers.md](https://github.com/zexy2/mealog-case-study/blob/main/docs/interview_questions_answers.md)

---

### 🛠️ What Was Built
1. **Node.js / TypeScript Backend (NestJS):**
   - **Closed-Set Resolution (D1):** The model perceives food descriptions, but never produces a calorie number directly. All nutrition is computed deterministically from verified regional composition data (TÜRKOMP / USDA) across 103 canonical foods.
   - **Portion Uncertainty Intervals:** Returns explicit `grams_p10`–`grams_p90` bounds alongside provenance data rather than a hidden point estimate.
   - **Confidence Routing:** Routes items to `auto_accept`, `review`, or `ask` (abstention) with localized Turkish/English clarification questions.
   - **Security & Privacy (D13):** Edge/Server-side EXIF/GPS scrubbing, PII redaction, rate limiting, and prompt-injection defense.

2. **Mobile App (React Native / Expo):**
   - Implements Capture, Review, Day, and Abstention screens.
   - Supports interactive candidate selection ("Seç & Kaydet"), inline item editing/deletion, and dynamic portion adjustments.
   - Verified on iOS Simulator, Expo Go, and Android bundle exports.

3. **Testing & CI Quality Gates:**
   - **280 Node.js / Vitest tests** covering edge controllers, adapters, rate limiter, and privacy pipeline.
   - **289 Python parity tests** for reference normalization, retrieval, and nutrition arithmetic.
   - **80 recorded golden-set fixtures** with regression gate in GitHub Actions CI (`make check`).

---

### ⚠️ Key Trade-Offs & Boundaries
* **Precision over Recall:** When a dish is not in the regional catalogue or confidence is low, mealog safely returns `ABSTAIN` (70/80 golden samples) and asks the user rather than hallucinating wrong calories.
* **Process-Local Idempotency:** The MVP uses an in-memory idempotency cache suitable for single-instance review; production scaling requires distributed Redis locks.
* **Evaluation Scope:** Focused on reproducible offline golden evaluation rather than unconstrained live API spend.

---

### 🚀 Top Next Steps
1. **Automated Catalogue Expansion:** Continuous pipeline ingesting OpenFoodFacts and regional national databases to expand catalogue coverage beyond the current 103 canonical foods.
2. **Multimodal Embeddings:** Hybrid visual retrieval (CLIP embeddings + BM25 text) for higher visual recall on complex multi-dish platters.
3. **Interactive Multi-Item Bounding Boxes:** User-tap segment correction for multi-item plates.

Thank you for reviewing my case study. I look forward to your feedback and discussing the architecture in the next round!

Best regards,  
**Zeki**


