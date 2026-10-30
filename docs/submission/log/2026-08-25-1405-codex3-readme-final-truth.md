# Final submission truth alignment

Agent: codex3
Issue: #373
Branch: `agent/codex3/readme-final-truth`
Base: `b25d95bfa23ee13a87b70b5f0b539a884b8049b8` (merged PR #372)

State: Submission-facing documentation now separates the grounded catalogue
pipeline from the D19/D20 unverified estimate lane. No source, threshold,
fixture, golden label, evaluator, baseline, workflow, or metric changed.

Done:

- Replaced the stale `0.85` decision-gate claim with the source-backed `0.75`
  effective-confidence threshold and current `auto_accept` action name.
- Updated README, walkthrough, and email draft from D1-D18 to D1-D20 and removed
  the obsolete whole-product claim that models never produce nutrition.
- Kept grounded nutrition authoritative while documenting the separate,
  bounded, explicitly accepted `llm_unverified_estimate` lane and its exclusion
  from grounded evaluation.
- Removed the resolved cooked/dry confusion from the active-failure table.
  Current deterministic probes abstained for cooked pasta, bulgur, manti,
  ezogelin, kadayif, prepared Turkish coffee, and brewed tea. Current low-score
  near-neighbour defects remain documented for legumes and tarhana soup.
- Corrected the Node suite count from 300/25 to the observed 313/26.
- Corrected `70/80 ABSTAIN` to the measured `70/80 ask`; `ask` also covers
  deferrals other than a catalogue-miss identity.
- Narrowed deletion language: user deletion clears meal/estimate caches, while
  the anonymized telemetry store cannot currently select events per user.
- Disclosed that Review duplicates a Turkish nutrition map for local preview
  arithmetic. This is not the grounded server pipeline, but it weakens the
  single-source boundary and remains technical debt.
- Made the GitHub Actions billing/spending blocker explicit instead of treating
  zero-step hosted jobs as green CI.

Checks:

- Fresh throwaway Python 3.11 virtualenv: `make check` passed; 287 pytest tests,
  invariants, STATUS check, and V0-V3 per-cuisine regression guard passed.
- Clean server install: build, ESLint, and 313 Vitest tests across 26 files passed.
- Clean mobile install: typecheck and focused mobile tests passed.
- Expo exports passed for iOS and Android with demo mode disabled. Bundle export
  is not device execution.
- `git diff --check`, `scripts/status.py --check`, and
  `scripts/check_invariants.py` passed.
- Mobile install reported 16 transitive audit findings (7 moderate, 9 high);
  no dependency was changed in this documentation-only session.

Next: Review and merge the documentation PR, rotate the provider key exposed
during development, clear the GitHub Actions billing/spending blocker and rerun
the submission commit, then record Loom and insert its real URL in the email.

Traps: D19/D20 narrowly supersede D1's whole-product wording but do not turn LLM
estimates into grounded truth. A candidate attached to an abstention is not an
accepted identity. A GitHub Actions run that fails before executing any step is
not passing CI, regardless of local green checks.
