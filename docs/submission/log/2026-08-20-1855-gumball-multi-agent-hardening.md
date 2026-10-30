## 2026-08-20 18:55 +03 — gumball
Issue:   #11
Did:     Made the coordination protocol enforceable. Added
         `scripts/check_claim_scope.py` (CI reads the `## Scope` section of the
         linked claim issue and fails on any file outside it). Split the shared
         `AGENT_LOG.md` into one file per session under `log/`. Added a
         lowest-issue-number tie-break for simultaneous claims, a `Blocked by #N`
         convention, guidance to regenerate rather than hand-merge generated
         files, and `docs/onboarding-prompt.md`.
Result:  No eval impact. No pipeline, fixture or metric touched.
Next:    Branch protection. It cannot be set through the available API and needs
         @zexy2 to enable it in repository settings; until then "never commit to
         main" is prose, and it is now the largest remaining hole in the protocol.
Traps:   - `AGENT_LOG.md` is no longer where entries go. Write a new file in
           `log/`. Appending to the old file will conflict with every other agent.
         - The scope gate parses **backticked paths only** inside `## Scope`.
           Prose paths are invisible to it, so a claim that lists files in plain
           text will fail every pull request with "no machine-readable scope".
         - `STATUS.md` is generated. If it conflicts, take either side and run
           `make status`; do not resolve it by hand.
