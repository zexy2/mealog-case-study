# Unit-prefix negative-alias audit

Agent: `codex5`
Claim: #231
Requested issue: #230
Branch: `agent/codex5/unit-prefix-negative-alias-audit`
Base: `origin/main` at `6b05422dfdc4e29d0d77e833637f2c9f5fd7235f`

## Report-first finding

No leak was reproduced on current main. The exact ten requested inputs all
returned `food_id=ABSTAIN`, `action=ask`, and `kcal=0.0` in the offline Python
V3 runner. Quantity/unit prefixes were tested both as the complete text input
and at the actual boundary where the provider supplies `surface_form` plus a
separate `portion_hint`.

| Input | food_id | action | kcal |
|---|---|---|---:|
| `Türk kahvesi` | `ABSTAIN` | `ask` | 0.0 |
| `turk kahvesi` | `ABSTAIN` | `ask` | 0.0 |
| `bir fincan Türk kahvesi` | `ABSTAIN` | `ask` | 0.0 |
| `bir fincan turk kahvesi` | `ABSTAIN` | `ask` | 0.0 |
| `1 fincan turk kahvesi` | `ABSTAIN` | `ask` | 0.0 |
| `fincan turk kahvesi` | `ABSTAIN` | `ask` | 0.0 |
| `haşlanmış makarna` | `ABSTAIN` | `ask` | 0.0 |
| `bir porsiyon haşlanmış makarna` | `ABSTAIN` | `ask` | 0.0 |
| `bir kase ezogelin çorbası` | `ABSTAIN` | `ask` | 0.0 |
| `iki adet kadayıf tatlısı` | `ABSTAIN` | `ask` | 0.0 |

The `bir fincan` / `bir porsiyon` / `bir kase` / `iki adet` cases retained the
quantity and unit in the portion hint, but the normalized food query remained
the cooked or coffee surface form and still abstained. `çay` and `demlenmiş
çay` were also checked and remained abstained.

## Matching semantics

Negative aliases are not compared as one exact whole-query string. Python's
`server/src/mealog/pipeline/retrieval.py:155-164` splits both query and alias
into tokens and compares the alias as an equal, contiguous token slice inside
the query. TypeScript mirrors this at
`server/src/pipeline/retrieval/index.ts:197-224`; its comment at lines 194-195
states that matching is whole-token only, so a substring does not match. The
resolver then caps every matched target at the confusion score rather than
allowing it to win (`server/src/pipeline/retrieval/index.ts:328-342`).

## Scope and eval

No source fix is justified. No locale, pipeline, resolver, threshold, evaluator,
fixture, golden, scorecard, or baseline file changed; the only repository change
is this required log. The issue-provided scorecard and baseline therefore have
no before/after delta and were not regenerated. No live provider key or request
was used.

The graph audit was run on a temporary copy of the two retrieval code files: it
found 32 nodes and 40 edges, with no repository graph artifact created. Direct
line-level inspection and the resolver replay above are the authoritative
evidence for this narrow behavior check.

## Verification

- Offline current-main V3 runner probe: 10/10 requested inputs abstained.
- Tea controls: `çay` and `demlenmiş çay` abstained.
- No code or data change requiring evaluator rerun.
- `git diff --check` will be run before commit; hosted CI remains the final
  authority for the log-only PR.

## Traps

Do not add prefixed aliases or alter the matcher just because an older run
reported `bir fincan turk kahvesi` as 19.5 kcal; that result is not reproducible
on current main. Do not turn the separate `portion_hint` into retrieval text,
change thresholds, or claim a provider/live result from this offline stub.
