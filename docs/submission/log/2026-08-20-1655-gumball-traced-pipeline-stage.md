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
