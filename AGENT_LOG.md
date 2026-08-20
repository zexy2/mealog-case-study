# Agent log

Append-only. Newest at the bottom. One entry per working session.

Template:

```
## YYYY-MM-DD HH:MM TZ — <handle>
Issue:   #<n>
Did:     <what changed>
Result:  <eval impact, or "no eval impact">
Next:    <what you would do next>
Traps:   <anything that will bite the next agent>
```

---

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

## 2026-08-20 16:55 +03 — gumball
Issue:   commented on #1
Did:     Traced the pipeline stage by stage over the seeded golden set to document
         the runtime flow. No code changed.
Result:  No eval impact. Two real defects found and written up on #1:
         (1) `pilav` does not retrieve `tr.pilav` — token overlap fails on
             inflected forms (`pilav` vs `pilavi`) and no alias exists.
         (2) `negative_alias` is loaded into `pack.negative_aliases` but
             `retrieval.search()` never reads it, so the kuru fasulye / baked
             beans trap abstains for the wrong reason (found nothing) rather
             than the right one (recognised a known confusion).
Next:    Both belong to #1. Do not paper over (1) with an alias row — it is a
         class of bug, not a missing entry.
Traps:   The `mediterranean` bucket currently shows inflated abstention because
         of the above, which drags V3's coverage down. Do not read the current
         V3 row as evidence that gating hurts; re-measure after #1 lands.
