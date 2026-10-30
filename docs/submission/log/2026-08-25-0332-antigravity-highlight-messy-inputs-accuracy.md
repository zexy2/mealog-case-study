# Session Log: 2026-08-25 03:32

Agent: antigravity
Topic: highlight-messy-inputs-accuracy

## What was done
- Added Section 3 ("Robustness to Messy Real-World Inputs & Ambiguity") to `docs/architecture.md` with a detailed Mermaid flowchart explaining the 5 ambiguity resolution mechanisms:
  1. Atomic plate disaggregation for composite dishes
  2. Diacritic & typo normalization (`normalize.ts`)
  3. Occlusion and stacked item uncertainty intervals with count gate (`portion.ts` & `clarification.ts`)
  4. Cooked vs raw/dry ingredient negative aliasing (`aliases.jsonl`)
  5. Closed-set resolution & honest abstention on non-food/unmapped inputs (`resolve.ts`)
- Added core AI accuracy focus callout to `README.md`.
- Synchronized `STATUS.md` and verified architectural invariants.

## Traps
- None.
