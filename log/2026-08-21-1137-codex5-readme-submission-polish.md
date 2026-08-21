## 2026-08-21 11:37 +03 — codex5

Issue:   #60; claim #63
Branch:  `agent/codex5/readme-submission-polish`

Did:     Reordered and tightened `README.md` for the reviewer cold start. Removed
         the stale STATUS warning and pointer, kept the #56 setup/run/
         troubleshooting text unchanged apart from nesting its headings under
         `Run it`, left Results as the exact #57 marker, added the required
         evidence sections, and removed every TODO except the named demo slot.
         Regenerated `STATUS.md` because the README TODO count changed.

Result:  The narrative table is 147 words and all other budgeted sections are at
         or below their issue limits. A fresh throwaway virtualenv passed `make
         check`: 57 tests, Ruff, invariants, generated STATUS, and the offline
         per-cuisine regression guard. No dependency, code, evaluation, or
         decision changes.

Traps:   Claim #61 initially listed all of `README.md` for #57, so the boundary
         was recorded on both claim issues before editing; #60 owns the narrative
         and ordering, while #57 owns only the Results insertion. `STATUS.md` is
         generated and allowlisted: run `make status` after removing README TODOs;
         never hand-edit its count.
