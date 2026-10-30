## 2026-08-20 19:25 +03 — gumball
Issue:   #13
Did:     Added `scripts/check_main_push.py` and a CI job that fails `main` when a
         commit did not arrive through a merged pull request. Corrected AGENTS.md
         section 4 to say this is detected, not prevented.
Result:  No eval impact.
Next:    Replace this with a real ruleset if the repository ever becomes public or
         moves into an organisation. Detection is the fallback, not the goal.
Traps:   - **Rulesets do not work here.** GitHub does not enforce them on private
           repositories outside a Team plan; the ruleset settings page says so in
           a warning banner. I recommended enabling one before reading that
           banner. Creating the ruleset anyway is harmless and it activates
           automatically if the plan or visibility changes.
         - The guard deliberately exits zero when the API call fails. A guard that
           goes red for its own reasons is one everybody learns to ignore, and an
           ignored guard is worse than no guard.
