# Public third-party data attribution

Agent: `codex3`
Claim: #383
Branch: `agent/codex3/public-data-attribution`
Base: `origin/main` at `dd6442159e0f35aa2334cf5046ee68ec3d50bf94`

## State

Prepared a documentation-only attribution boundary for publishing the
repository as a noncommercial case study. Repository visibility was not changed
in this session.

## Done

- Added the required visible TürKomp attribution and clickable source/terms
  links to the main README, a repository-level third-party data notice, the
  Turkish pack metadata, and a README adjacent to the Turkish data.
- Preserved `restricted-noncommercial`; commercial permission is not claimed.
- Distinguished project IDs, labels, aliases, servings, density annotations,
  retrieval metadata, and confidence logic from official source fields.
- Added MEXT attribution and preserved its `unverified` commercial boundary.
- Recorded USDA FoodData Central separately as public-domain source data.
- Explicitly avoided using this notice as a blanket software or data licence.

## Verification

- Fresh Python 3.11 venv: `pip install -e "server[dev]"` passed.
- `make test`: 287 passed.
- `make lint`: passed.
- `python eval/harness.py --check-regression`: passed.
- `python scripts/check_invariants.py`: passed.
- `python scripts/status.py --check`: passed.
- `git diff --check`: passed.
- `python scripts/check_secrets.py --diff-base origin/main`: passed; 458 tracked
  files and added diff lines scanned.

## Eval impact

None. No food value, alias, pipeline, evaluator, fixture, golden label,
baseline, threshold, dependency, mobile, server runtime, or CI file changed.

## Traps

Attribution does not create commercial permission and does not replace written
legal permission. TürKomp's official terms also restrict modification; do not
describe mealog IDs, transliterated labels, serving defaults, density metadata,
or retrieval behavior as official TürKomp fields. Do not add a blanket MIT-like
licence over third-party data. The official TürKomp site timed out during a
command-line reachability probe, so no live-site availability claim is made.

## Handoff

State: attribution changes complete and locally verified; visibility unchanged.
Done: scoped files and session log prepared.
Next: commit, push, open PR, and read hosted CI before merge/publication.
Traps: keep the repository noncommercial; attribution is not commercial consent.
Branch: `agent/codex3/public-data-attribution` at the commit containing this log.
