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
