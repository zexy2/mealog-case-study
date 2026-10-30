## 2026-08-21 00:22 +03 — codex
Issue:   #21 (expanded to #6 + #3)
Did:     Landed photo contract first in `a5b2c1a`, then wired constrained Gemini
         REST perception and fixture recording in `878ad1f`. Added `VisionInput`,
         multipart image upload with 10 MiB/MIME limits, SHA-256 fixture keys,
         live sample-id rejection, D5/A8 retention decisions, and strict
         observation-only response validation. No real fixture was fabricated.
Result:  `make check` passed in throwaway venv: 20 tests, ruff, invariants,
         STATUS check, and V3 regression guard. Mocked image request, current
         Gemini REST shape, hash recording, D1 rejection, multipart replay and
         live sample-id rejection passed. `make eval-live` is blocked before any
         request because `GEMINI_API_KEY` is absent and no image inputs exist.
Next:    Supply a Gemini key and real image inputs, then run `make eval-live` and
         inspect every recorded fixture before updating the scorecard.
Traps:   Do not run live eval with a fixture `sample_id`; #6 makes that path
         invalid for Gemini. Do not label seeded files as real. Shared workspace
         switched branches during this session; verify `git branch --show-current`
         before staging or committing.
