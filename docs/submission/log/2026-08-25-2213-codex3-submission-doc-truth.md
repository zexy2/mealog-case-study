# Session: submission document truth boundary

Agent: codex3
Issue: #389

State: Generated status and reviewer-facing supporting documents now match
current main and separate repository evidence from external delivery actions.

Done:
- Made Loom and email probes partial when references exist; the tree no longer
  self-certifies playback, access, sending, receipt, or device execution.
- Replaced obsolete STATUS work-order text with current verification boundaries.
- Added focused tests, including a dependency-tree regression after `npm ci`
  exposed a broken-symlink crash in the fine-tuning probe.
- Rewrote architecture around Gemini 3.6 Flash, the 0.75 weakest-signal gate,
  D19/D20's separate estimate lane, D14's unshipped face-mask boundary, and
  D18's process-local telemetry boundary.
- Removed clean-clone-broken screenshot links and stale catalogue claims from
  the EatBetter comparison; retained current sample sizes and limitations.
- Reduced the email draft to a short submission summary and replaced the stale
  self-hosted-CI claim with a latest-Actions pre-send check.

Verification:
- Throwaway Python 3.11 venv install passed.
- `make check`: 291 pytest tests, lint, invariants, status and regression passed.
- Node build/lint and 313 Vitest tests passed.
- Mobile typecheck and Expo iOS/Android export passed.
- Secret guard, relative-link check and `git diff --check` passed.
- Mobile `npm ci` reported 16 transitive audit findings (7 moderate, 9 high);
  dependency remediation is outside this documentation claim.

Eval impact: None. No pipeline, threshold, catalogue, fixture, golden label,
baseline or evaluator changed; all documented figures are unchanged current
replay results.

Next: Commit, push, open PR, read hosted CI, then merge and close #389.

Traps: A Loom URL or email draft proves only that a reference exists. Do not
promote either to `working`, and do not recursively glob the repository from
`scripts/status.py`: npm optional-package symlinks can make status depend on
whether `npm ci` has run.
