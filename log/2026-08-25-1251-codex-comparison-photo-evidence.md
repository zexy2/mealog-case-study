# Comparison visual-evidence update

Date: 2026-08-25 12:51 +03
Agent: codex
Issue: #369
Branch: `agent/codex/comparison-photo-evidence`
Base: `c1eb990`

## Done

- Expanded `docs/comparison.md` with a local screenshot matrix covering 30
  Mealog PNG captures across 17 captured test IDs (`test01`–`test16`, `test18`)
  and 32 EatBetter JPEG captures across 16 upper/lower pairs.
- Recorded the intentional gap: `test17` was skipped and has no pair; `test18`
  has a Mealog capture but no EatBetter pair.
- Added explicit boundaries for offline metrics versus local visual captures;
  no screenshot-derived accuracy metric or EatBetter internal claim was added.
- Added the verified privacy boundary: active metadata/PII sanitization and
  ephemeral photo handling, while RGBA face blurring remains decoupled from the
  live compressed-image edge path.
- Added the verified training boundary: no training run/checkpoint/spend;
  correction telemetry is a local human-review signal, not automatic labels or
  model/catalogue updates.

## Verification

- `git diff --check` passed.
- Graphify read-only documentation scan completed in a temporary worktree; its
  generated output was kept out of the branch.
- No evaluator, source, fixture, golden, baseline, threshold, or image binary
  changed.

## Eval impact

None. Documentation-only; published measurements remain unchanged.

Traps: The screenshot folders are ignored local artifacts, so links in the
matrix work only in a checkout that has the user's local capture pack. Do not
call that matrix clean-clone, CI, live-provider, or controlled accuracy evidence.
Do not describe `blurFacesInPixelArray` as active JPEG/Gemini preprocessing; D14
keeps it outside the live edge controller. Do not infer EatBetter training,
retention, face handling, or model behavior from screenshots.
