# Final delivery documentation refresh

Agent: codex
Issue: #189
Branch: `agent/codex/final-delivery-docs`
Base: `origin/main` at `4bcbfa38a39f25a320de355119026ea227bd2bd6`
Integration: normal `--no-ff` merge commit `2c7bf40`

## Scope and evidence

Only the declared documentation scope changed: `docs/assumptions.md`,
`docs/comparison.md`, `docs/walkthrough.md`, and this log. README.md remains
outside claim #189's scope, and the repository has no email document; the
walkthrough's closing email checklist was reconciled instead.

Documentation now reflects merged PRs #191, #192, #194, #196, and #199:

- PR #191 is a current-main iOS Simulator/Expo Go live-provider smoke over four
  selected gallery flows, not all twelve images, a deployment, broad live
  accuracy result, or a live multi-item acceptance gate. The simit-plus-ayran
  run returned two items but does not prove visual counting of two simits.
- PR #192 validates image content signatures at the Nest edge and Gemini adapter,
  rejects MIME spoofing, and clears the adapter's strong request-input reference
  after the provider call. No image is persisted.
- PR #194 preserves explicit quantity evidence. Unknown provider quantity stays
  unknown and requires review; no visual count is fabricated.
- PR #196 provides item-scoped catalogue-backed clarification/correction and
  server-side re-grounding/recomputation while preserving untouched items.
- PR #199 propagates degraded results end to end and forces `review`; degraded
  results never become `auto_accept`.
- EatBetter wording is bounded to observed public product surfaces and does not
  infer internal architecture or claim mealog wins overall.

## Fresh offline measurements

Regenerated on current `origin/main` `4bcbfa3`, rather than copying old values:

- V3: 12/80 committed (15%), 68/80 ask, Item F1 0.15, FP 86.0%, calorie MAPE
  12.7% over 2/2 eligible/scored complete-positive rows. The 72 partial-truth
  rows remain outside the calorie denominator.
- Retrieval: Recall@1 100.0%, Recall@5 100.0%, MRR 1.000, Accept@1 99.2%, and
  0/22 false accepts. The 145-variant set is not presented as live-provider
  accuracy or coverage of every catalogue entry.
- Scorecard SHA-256: `bfb1703b317b2f7f075898606e3e8de21cbc5f986a9bbcb39d9625b06107a65e`
- Baseline SHA-256 unchanged: `a95e4d1ff2b2d2f377aeaafe0c89d0eb007638af09f7324d237f50adb30da8e6`

## Verification

Throwaway Python environment:

```text
PATH="/tmp/mealog-codex189-final-iRIxZ5/venv/bin:$PATH" make check
All checks passed!
261 passed in 2.56s
all architectural invariants hold
STATUS.md matches the repository
no per-cuisine regression in V3
```

Additional checks:

- `python3 scripts/status.py --check` -> `STATUS.md matches the repository`.
- `git diff --check` -> clean.
- Server `npm run build` -> passed; `npx eslint src test` -> passed; `npm test`
  -> 16 files, 193 tests passed. The package script `npm run lint` itself is
  blocked locally by an existing ignored `server/.venv/.../estimator.js` that
  ESLint scans; no lint config or source file was changed.
- Mobile `npm test` -> all locale/demo/day/clarification checks passed;
  `npm run typecheck` -> passed; after `npm ci` from the committed lockfile,
  `npm run verify` -> Android export succeeded. The install reported 16 audit
  vulnerabilities (7 moderate, 9 high); no dependency files were changed.
- Hosted CI read after the push: workflow runs `32590519536` and `32590521495`
  both passed `check`, `server (node)`, and `mobile`; only the expected
  `main-arrived-via-pull-request` check was skipped.

Traps: Do not edit README.md or invent an email document under this claim. Do
not call the two-item simit-plus-ayran smoke a visual-count proof. Do not turn
partial nutrition truth into zero calories, and do not quote offline scores as
live-provider accuracy. No source, mobile, golden, baseline, threshold,
evaluator, or EatBetter-internal claim was changed.
