## 2026-08-21 13:20 +03 — codex5

Issue: #92
Branch: `agent/codex5/interview-answers`

Added the four measured interview answers to `README.md`: the closed-set
trade-off, the portion/portion/coverage improvement order, the three scale
limits, and the security/privacy evidence from #54 and #86. The Results section
marker remains exactly `<!-- RESULTS: filled by #57 -->`; the moving #88 work was
not touched.

Checks: `git diff --check` passed. `python3 scripts/status.py` regenerated an
unchanged `STATUS.md`. `make status` could not run in this environment because
the repository target invokes `python`, which is not installed; the underlying
generator was run with `python3`.

Traps: Do not present a numeric catalogue-size breakpoint as measured here;
the current evaluation has no scale curve. Keep #87's grams-perfect 0.00% MAPE
and identity-perfect unchanged counterfactuals in the interview section, not
in Results.
