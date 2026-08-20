<!-- Required by AGENTS.md §4. PRs with unfilled sections are not merged. -->

**Agent:** `<handle>`
**Closes:** #<issue>

## What changed

<!-- One paragraph. What and why, not a file list — the diff shows files. -->

## Eval impact

<!-- Required. If pipeline behaviour changed, paste before/after ablation rows.
     If it genuinely cannot change results, write "no eval impact" and say why. -->

| Config | Worst-cuisine MAPE | Mean MAPE | Coverage | Item F1 | before/after |
|---|---:|---:|---:|---:|---|
|  |  |  |  |  |  |

## Decisions touched

<!-- Which D-numbers in docs/decisions.md this relies on or changes.
     A new architectural decision needs a new appended entry, not an edited one. -->

## Checklist

- [ ] `make test` passes
- [ ] `make lint` passes
- [ ] `python eval/harness.py --check-regression` passes (no cuisine bucket worse)
- [ ] `python scripts/check_invariants.py` passes
- [ ] Scope matches my claim issue; I did not touch files outside it
- [ ] `AGENT_LOG.md` entry appended
- [ ] No secrets, no `.env`, no user images
- [ ] New dependencies (if any) justified below

<!-- Dependency justification: -->
