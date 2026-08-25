# Submission-readiness documentation cleanup

Agent: `codex3`
Claim: #353
Branch: `agent/codex3/submission-readiness`
Base: `eff5cd989742901d607d35cc2c397444f5a0f206`

## State

Repository-controlled submission documents no longer claim an unrecorded Loom
or sent email, contain fake screenshot paths, infer unsupported EatBetter
behavior, reference the removed Python HTTP test, or instruct the presenter to
show the mobile audit accordion open by default.

## Done

- Changed README walkthrough and email rows from false `Delivered` states to
  explicit pending/draft states, while separating local runtime evidence from
  what repository CI can prove.
- Replaced the uncommitted EatBetter screenshot comparison with an evidence
  boundary and corrected sourced-food inventory to 103/103.
- Updated idempotency evidence to the delivered NestJS E2E test and labelled the
  historical evaluation commit rather than calling it current main.
- Updated the walkthrough to tap the collapsed audit accordion, removed its
  stale scorecard hash, and repaired the closing script sentence.
- Marked the email draft `Do not send yet`; removed the stale Python test count.

## Verification

- Throwaway Python 3.11 virtualenv: `make check` passed; 284 Python tests.
- Node: build, lint, and 299 tests passed across 25 files.
- Mobile: focused tests and TypeScript typecheck passed.
- Expo iOS and Android exports passed. These exports are not device execution.
- `git diff --check` passed; all local Markdown links in the four edited files
  resolve; stale placeholder/reference scan returned no matches.

## Eval impact

None. No source, pipeline, threshold, fixture, golden label, baseline,
evaluator, dependency, or workflow changed. Published metrics are unchanged.

## Next

Human actions still block submission: rotate the exposed provider credential
tracked in #64, resolve GitHub Actions billing and obtain a green hosted run,
record the Loom from current main, insert its real URL, then send the email.

## Traps

Do not turn `Pending recording` back into `Delivered` until a real Loom URL
exists. Bundle export is not simulator/device proof. Do not add competitor
screenshot claims without committed/licensed evidence and shared ground truth.
The mobile `Nasıl bulundu?` audit accordion is collapsed by default on current
main; the recording must tap it open.
