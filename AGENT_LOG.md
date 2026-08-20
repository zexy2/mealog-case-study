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

## 2026-08-20 17:40 +03 — gumball
Issue:   #1 (claimed)
Did:     Replaced token-overlap retrieval with IDF-weighted asymmetric coverage over
         word and character 3–5-grams, plus `negative_alias` handling. Added
         `eval/retrieval_eval.py` (50 positive variants + 13 out-of-catalogue) and
         7 regression tests.
Result:  Recall@1 88.0% -> 100.0%, MRR 0.880 -> 1.000, false accepts 0/13 unchanged.
         Per cuisine: east_asian +15.4, western +11.8, mediterranean +10.0.
         End-to-end V1/V2 item F1 0.92 -> 1.00, coverage 89% -> 100%; V3 coverage
         67% -> 78%. No cuisine bucket regressed.
Next:    #3 (real fixtures) is now the blocker on every end-to-end number.
Traps:   - Three things broke in ways only measurement caught, in order:
           (1) cosine similarity ranked correctly but scored too low for
               `resolve.MIN_ACCEPT_SCORE`, because it penalises short queries
               against foods carrying many aliases. Switched to coverage.
           (2) `TfidfVectorizer.transform()` silently drops n-grams outside the
               fitted vocabulary, so coverage was computed only over parts of the
               query the catalogue already knew — "pizza margherita" scored 0.55
               against a Turkish rice dish. Unseen n-grams are now charged at max
               IDF in the denominator.
           (3) Recall@1 alone hid (1) entirely. The eval now reports Accept@1
               beside it. Do not drop that column.
         - Typos now rank first but sit below the accept threshold, so they become
           a suggestion rather than a silent log. That is deliberate; if you raise
           recall by loosening the threshold, re-run the false-accept table.
         - Recall@1 is 100% against an 8-food-per-locale catalogue written
           alongside the queries. Treat it as "handles inflection", not "solved".

## 2026-08-20 17:55 +03 — gumball
Issue:   #1 / PR #4
Did:     Acted on an external review. Verified each claim before accepting it;
         verification found one defect the review missed and CI had been
         reporting all along.
Result:  Three real problems, all mine:
         (1) `httpx2` never declared — `fastapi.testclient` cannot import
             without it, so a clean install failed at test collection. CI has
             been red on this since the first commit.
         (2) `scikit-learn` used by retrieval since PR #4 and never declared.
             Invisible locally because the dev sandbox ships it. The PR
             checklist claimed "no new dependencies"; that was false.
         (3) `docs/finetuning-plan.md` was headed "Implemented — locale
             adapter". Nothing is trained. Corrected to "Scoped, not yet
             trained", with the earlier wording named rather than reworded away.
         Also softened a scorecard footer that claimed gating trades coverage
         for accuracy — seeded fixtures cannot support that claim.
         Clean venv now: 20 passed, invariants hold, no cuisine regression.
Next:    #3. Three new issues filed from the review (portion density, confidence
         ignoring portion uncertainty, API cannot accept an image).
Traps:   - **Read CI.** 14 runs, 14 failures, and `make check` was green locally
           the whole time because the sandbox happens to ship sklearn and httpx.
           A guard you do not look at is not a guard. Check the Actions tab
           before claiming anything is green.
         - Verify dependency changes in a throwaway venv, not in the dev
           environment. `python -m venv /tmp/x && pip install -e "server[dev]"`.

## 2026-08-20 18:15 +03 — gumball
Issue:   (none — tooling, raised by external review feedback)
Did:     Added `scripts/status.py`, which generates `STATUS.md` by probing the
         working tree: does an app project exist, does the vision adapter still
         raise NotImplementedError, does the API accept an image, how many golden
         samples and how many fixtures are still synthetic, how many TODO groups
         remain in the README. Wired a `--check` staleness guard into CI and
         `make check`, and put a pointer to it at the top of the README.
Result:  No eval impact. Two reviewers in a row read the repo and reported the
         missing app and unreal numbers as discoveries; both were known and
         scheduled, but nothing in the repo said so in one place.
Next:    Unchanged — #6, then #3.
Traps:   STATUS.md is generated. Do not hand-edit it; CI compares it against the
         probes and fails. If a probe is wrong, fix the probe. And do not add a
         timestamp to the output — it would make every run a spurious diff.
