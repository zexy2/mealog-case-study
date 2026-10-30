# Wave 0 — TypeScript workspace scaffold

Agent: `claude`
Issue: #105
Claim: #111
Branch: `agent/claude/ts-scaffold`
Base: `origin/main` at `263c159`

## Change

Stood up the TypeScript workspace for the Node/TS port (#106): npm workspace,
`tsconfig`, vitest, ESLint flat config, the NestJS edge bootstrap (`main.ts`,
`AppModule`, `HealthController`), and the two modules every later wave imports
— `src/domain/{models,taxonomy}.ts` and `src/pipeline/ports.ts`.

`domain/taxonomy.ts` and `domain/models.ts` are ported 1:1 from
`server/src/mealog/domain/`. Member names and string values are identical:
`E1`–`E12`, the six cuisine buckets, the three ground-truth tiers, `ABSTAIN`,
and the `AUTO_TAGGABLE`/`PORTION`/`CLOSED_SET_VIOLATIONS` groupings. Domain
field names keep Python's snake_case, because those objects cross the API and
fixture boundary where the wire shape is the contract.

Added a D12 invariant to `scripts/check_invariants.py`: zero `@nestjs/` imports
under `src/domain/` or `src/pipeline/`. It catches both `import … from` and
`require(…)` forms. CI gains a `server (node)` job running
`npm ci && build && lint && test` beside the existing Python gates. **No Python
file was deleted or edited except `check_invariants.py`.**

## Verification

Clean clone (`git archive HEAD` into an empty directory), empty npm cache,
Node 22.14.0 — the same major CI pins:

| Gate | Result |
|---|---|
| `npm ci` | 281 packages, exit 0 |
| `npm run build` | exit 0 |
| `npm run lint` | exit 0 |
| `npm run test` | 25 tests / 2 files, exit 0 |

Python gates in a throwaway venv (`/tmp/mealog-claude-111-venv`), unchanged
from baseline: ruff clean, **249 passed**, invariants hold, `status.py --check`
matches, `harness.py --check-regression` reports no per-cuisine regression.

Eval impact: **none, and it is measured, not asserted.** Full V0–V3 scorecard
generated on `origin/main` and on this branch is byte-identical —
`sha256 f376607c…b434` on both sides, zero lines differing.

Invariant proven to fire: added `import { Injectable } from '@nestjs/common'`
to `domain/models.ts` → exit 1 with a `[D12]` violation; added a
`require('@nestjs/core')` to `pipeline/ports.ts` → exit 1 with both violations;
reverted → back to green.

## Not done here, deliberately

No pipeline logic ported — that is Wave 1, and a large PR here blocks five
agents behind one review. D12 itself is not written to `docs/decisions.md`;
that is human-gated and claim #110 owns it.

## Traps

**The claim-scope parser reads every backticked path in the `## Scope`
section, including prose.** My first revision of #111 put a parenthetical
sentence inside that section and silently widened the lock from 15 paths to 18
— binding `check_claim_scope.py`, a file I had no intention of touching. The
gate would have *passed*, because a too-wide lock never fails; it just quietly
takes files off other agents. Keep prose out of the Scope block and re-parse
your own issue before you start.

**A local red can be an artifact of how you got the tree.** This sandbox has no
git credential for the private repo, so the working copy was reconstructed over
HTTP, which drops the executable bit. Ruff then reported three `EXE001`
failures on *unmodified `main`*. Check file modes before believing a failure
that blames code you did not touch.

**Run ruff the way CI runs it: `cd server && ruff check src tests ../scripts`.**
From the repository root it never loads `server/pyproject.toml`, so
`line-length = 100` is ignored and it invents E501s that CI will never see.

**`server/dist/` is not covered by `.gitignore`.** `npm run build` now emits it,
and `git add -A` will happily commit compiled output. `apps/mobile` has the
same gap from `npx expo export`. Out of scope for #105 — it needs its own
one-line PR against `.gitignore`; do not fold it into a feature branch.

**NestJS under vitest works right now only because nothing is injected.**
esbuild honours `experimentalDecorators` from tsconfig but ignores
`emitDecoratorMetadata`, so the first Wave 2 provider with a constructor
dependency will fail to resolve by type under the test runner even though
`tsc` builds it. Expect to add an SWC transform to `vitest.config.ts` in that
PR, not this one.

**`tsconfig.json` sets `rootDir: "."`, not `"src"`,** so `test/` is
type-checked by the same `npm run build` gate rather than only at runtime. The
emitted entrypoint is therefore `dist/src/main.js`, which is what
`package.json` `main` and `start` point at. Changing `rootDir` moves that path.
