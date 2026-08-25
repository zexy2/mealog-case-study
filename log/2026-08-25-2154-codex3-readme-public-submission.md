# Session: public-submission README polish

Agent: codex3
Issue: #387

State: README is reviewer-first, current, and public-submission safe.

Done:
- Reordered the README around product thesis, measured evidence, comparison, and reproducible setup.
- Replaced the stale billing/self-hosted CI warning with hosted green run #32884235704.
- Corrected the Japanese pack boundary to unverified legacy evaluation data.
- Added explicit hybrid/fine-tuning rationale, demo-state guidance, FP interpretation, and source-available licence limits.
- Removed sender-only access reminders, duplicated delivery tables, and a broken error-taxonomy path.
- Verified relative links, diff whitespace, generated status, invariants, and the full offline gate in a throwaway Python 3.11 virtualenv.

Next: Review PR rendering and hosted CI; merge only after all jobs are green.

Traps: STATUS.md cannot prove external Loom/email completion, so do not hand-edit it or use its external-deliverable rows as runtime evidence. `docs/architecture.md`, `docs/comparison.md`, and `docs/submission_email_draft.md` still contain separately scoped stale claims; this README-only PR does not silently rewrite them.
