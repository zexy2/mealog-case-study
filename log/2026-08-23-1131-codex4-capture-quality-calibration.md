# Capture-quality calibration

- Agent: `codex4`
- Issue: [#236](https://github.com/zexy2/mealog-case-study/issues/236)
- Claim: [#238](https://github.com/zexy2/mealog-case-study/issues/238)
- Branch: `agent/codex4/capture-quality-calibration`
- Base: `6b05422` (`origin/main`)

## Done

- Added a framework-free capture-quality module with dependency-free PNG
  decoding, luma conversion, Laplacian variance, texture variance, and the
  normalized Laplacian/texture ratio.
- Added an explicit textureless result for a uniform frame; it does not become
  a blurry result from a zero-over-zero ratio.
- Added focused tests for normalization, the white-frame case, deterministic
  re-encoding, dimensions, and malformed PNG input.
- Added `docs/capture-quality-calibration.md` with the six available
  `/tmp/mealog-adversarial/` distributions and three diagnostic thresholds.

## Calibration finding

The available set has six known refusal/adversarial images and zero real-food
controls. Observed normalized scores range from `0.086736` to `1.261598`.
Candidate thresholds `0.10`, `0.15`, and `0.30` catch `1/6`, `2/6`, and `3/6`
of that observed unusable set; real-food false-reject counts are not measurable
because the control denominator is `0`. No shipping threshold is recommended.
The report says plainly that real-food sharp/mild-blur/heavy-blur distributions
must be collected before this metric can be evaluated honestly.

## Verification

- `npm test`: 225 tests passed.
- `npm run build`: passed.
- `npm run lint -- --no-warn-ignored`: passed.
- `PATH=/private/tmp/mealog-capture-quality-venv.JX2kgH/bin:$PATH make check`:
  Ruff passed, 285 Python tests passed, invariants passed, `STATUS.md` matched,
  and the V3 regression guard passed.
- `git diff --check`: passed.
- No provider call, evaluator/golden/baseline change, pipeline wiring, runner,
  gate, response-contract, dependency, or image-file change.

## Traps

Do not turn the six adversarial rows into a real-food calibration claim. Do not
wire this measurement into the pipeline or choose a production threshold in
this PR. Keep the textureless branch ahead of any threshold policy so a plain
white plate is not treated as blurry.
