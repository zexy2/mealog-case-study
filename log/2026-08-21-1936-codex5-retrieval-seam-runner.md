# Issue #148 — update the runner caller after the retrieval seam removal

Agent: `codex5`
Issue: #148
Claim: #160
PR: #165
Branch: `agent/codex5/retrieval-seam`
Base: `origin/main` at `f465655`

## Scope amendment

The issue and claim were amended before code changes to include:

- `server/src/pipeline/retrieval/index.ts`
- `server/test/pipeline.retrieval.test.ts`
- `server/src/pipeline/runner.ts`
- `server/test/pipeline.runner.test.ts` if focused caller-test updates are needed

The runner files were added because merged PR #163 introduced the caller after
the original claim was created. No runner test change was needed: its mocked
factory already uses the zero-argument retrieval API.

## Change

Rebased the branch onto current `origin/main` (`f465655`). Updated
`server/src/pipeline/runner.ts` to call `createRetrieval()` with no injected
dependencies and pass the loader-backed `LocalePack` directly to `search`.
The retrieval module still imports `fold` directly from normalize and uses the
real loader pack type. No normalize, loader, scoring, golden-label, or baseline
files were changed.

## Scorecard evidence

After rebasing, before the runner wiring change:

```text
/tmp/mealog-codex5-148-current-venv/bin/python eval/retrieval_eval.py --out /tmp/mealog-codex5-148-current-before/retrieval.md
/tmp/mealog-codex5-148-current-venv/bin/python eval/harness.py --configs V0,V1,V2,V3 --out /tmp/mealog-codex5-148-current-before/v0-v3.md
```

After the runner wiring change:

```text
/tmp/mealog-codex5-148-current-venv/bin/python eval/retrieval_eval.py --out /tmp/mealog-codex5-148-current-after/retrieval.md
/tmp/mealog-codex5-148-current-venv/bin/python eval/harness.py --configs V0,V1,V2,V3 --out /tmp/mealog-codex5-148-current-after/v0-v3.md
```

- Retrieval scorecard SHA-256: `4a6050f329c8bf35415fff0d158b2557a90503215b7669a732db13fb14bda3a0` before and after.
- V0–V3 scorecard SHA-256: `f0441785eb4858f95a9db84ecef94a5ea4e8a43f1427d451da0cebe01a7fdf0e` before and after.
- `diff -u /tmp/mealog-codex5-148-current-before/retrieval.md /tmp/mealog-codex5-148-current-after/retrieval.md | wc -l` → `0`.
- `diff -u /tmp/mealog-codex5-148-current-before/v0-v3.md /tmp/mealog-codex5-148-current-after/v0-v3.md | wc -l` → `0`.

## Checks

- Server Node: `npm run build`, `npm run lint`, and `npm run test` passed (12
  files, 151 tests).
- Mobile: `npx tsc --noEmit` and `npx expo export` passed for Android and iOS.
- Python: Ruff, 249 pytest tests, architectural invariants, STATUS check,
  regression guard, and secret guard passed.

## Traps

The published branch still points to the pre-rebase commit, so the rebased
working history cannot be published with a force push under AGENTS.md §5. Keep
the final update non-destructive when publishing. Do not restore an ignored
compatibility argument: #148 requires the injection seam to be removed, not
deprecated.
