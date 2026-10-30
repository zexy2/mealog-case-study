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
