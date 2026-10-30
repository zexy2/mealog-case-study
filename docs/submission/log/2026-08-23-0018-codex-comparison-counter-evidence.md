# Comparison counter-evidence

Agent: `codex`
Issue: #214
Claim: #215
Branch: `agent/codex/comparison-counter-evidence`
Base: `origin/main` at `5bf42373a3c712c37cf899db8bcc0bb1186438c8`

## Catalogue verification

Read `locale_packs/tr/foods.jsonl` directly. It contains 53 food rows. Individual
checks found no catalogue entry for:

- `döner` — absent
- `poğaça` — absent
- `börek`, including `su böreği` — absent
- `köfte` — absent
- `pide` — absent
- `kebap` — absent

The issue's 2026-08-22 probe observation was recorded without rerunning it here:
ten out-of-catalogue images produced ten correct abstentions and zero false
accepts; the Turkish examples were döner, poğaça, and su böreği.

## Documentation change

`docs/comparison.md` now records both 2026-08-22 EatBetter count observations:
one two-simit image became three simits, while a second two-simit image was
counted correctly as two. On the second image, mealog returned one simit at
100 g / 329 kcal, reproduced three times through the API and three times on a
physical device at close, medium, and long framing. The document states the
two-point summary—EatBetter one miss and one hit, mealog two misses—and draws no
counting accuracy conclusion.

Verification: `git diff --check` passed. The evaluator was not run and no new
metric was computed, per issue #214. No screenshots, code, locale data, golden,
baseline, README, evaluator, or decision files changed.

Traps: Keep the two EatBetter observations side by side; do not delete the
over-count or turn the second correct count into an accuracy claim. Do not say
mealog is better at counting. Do not treat the ten-image probe as a retrieval
metric, and do not rerun or refresh the concurrent scorecard under issue #208.
