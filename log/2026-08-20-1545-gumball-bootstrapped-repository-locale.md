## 2026-08-20 15:45 +03 — gumball
Issue:   (none — bootstrap, pre-dates the claim process)
Did:     Bootstrapped the repository. Locale-pack abstraction (en_US, tr, ja_JP),
         pipeline stages with model-free nutrition computation, E1–E12 error
         taxonomy, cuisine-stratified eval harness with offline fixture replay,
         per-cuisine regression guard, 10 tests, decision log D1–D4, evaluation
         methodology, fine-tuning plan.
Result:  Harness runs offline and reproduces a scorecard. Numbers are NOT valid —
         fixtures are seeded placeholders flagged with `"_synthetic": true`.
Next:    (1) Wire the real vision provider + record fixtures. (2) Hybrid retrieval
         (BM25 + embeddings, RRF). (3) Sample ~30 weighed dishes into the golden set.
Traps:   - The first harness run scored deferred meals as zero-calorie answers,
           which inverted V3's result. Fixed by computing MAPE over covered
           samples only and reporting coverage beside it. Do not "simplify" that
           back into a single average — see D3.
         - `eval/golden/manifest.jsonl` is ground truth. Changing a label changes
           every historical number. Human sign-off required.
