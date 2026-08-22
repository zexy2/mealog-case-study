# Final delivery audit

Read-only audit against `origin/main` at `95bc0be58b1df14e88e8d3b9177eedd16cbca533`.
No source, baseline, golden label, or evaluator file changed.

## Blocker checklist

- [ ] **Merge order:** PR #158 is merged. PR #184 is open with `UNSTABLE` state
  and a pending mobile check. PRs #180 and #185 are clean but still based on
  pre-#158 `29d0ff1`; rebase both onto `95bc0be`. PR #185 must re-run evaluation
  after the 38-food catalogue merge. PR #39 remains conflicting and parked under
  D11; do not merge it as a substitute.
- [ ] **Documentation freshness:** `README.md` still calls the Node edge,
  comparison, results, and several deliverables pending. `docs/evaluation.md`
  mixes current `n=80` prose with historical `n=25` decomposition. Current
  `docs/comparison.md` still reports 69 foods, 6% coverage, and pending
  post-#173 MAPE; current main has 99 foods, 15% V3 coverage, and 2/2
  calorie-eligible/scored rows at 12.7% MAPE. The 145-variant set is legacy
  evidence, not coverage of the 30 new en_US entries. `docs/walkthrough.md`
  still says `POST /v1/meals` is not implemented and still says 69 foods.
- [ ] **Local run boundary:** README documents build/lint/test but not starting
  the Node service or calling `/health` / `/v1/meals`. `Makefile api` still
  starts the Python FastAPI path, which conflicts with D12's delivered
  Node/TypeScript service. Mobile live mode needs both
  `EXPO_PUBLIC_DEMO_MODE=false` and `EXPO_PUBLIC_API_URL`; no QR, API URL, or
  deployment instructions exist.
- [ ] **Live/device/deployment evidence:** repository source and Nest e2e tests
  prove a Node edge exists, but no live mobile-to-Node request, physical-device
  or emulator run, hosted endpoint, or production deployment was verified.
  Default mobile behavior is deterministic demo mode; its `demoData.ts` path
  makes no provider or network call. Do not present it as live-provider proof.
- [ ] **Accuracy claim boundary:** offline current V3 replay reports 15%
  coverage, Item F1 0.15, FP rate 86.0%, and 12.7% worst/mean MAPE. Only 2/80
  samples are calorie-eligible and 2/2 are scored; partial/identity-only truth
  stays out of the calorie denominator. No device or live-provider accuracy is
  established. Current `python3` without the project environment failed on
  missing `sklearn`; the same replay succeeded in the existing throwaway venv.
- [ ] **Security/privacy:** `.env` is ignored, `.env.example` has placeholders,
  and the secret guard passed (`318` tracked files). The edge trusts optional
  `X-User-Id` and defaults to `demo-user`; no authentication or rate limiting is
  present. Image validation trusts the supplied MIME type. Provider retention
  terms are acknowledged in D5 but user consent/deletion policy is not shown.
- [ ] **Reliability/observability:** Gemini has 4-second pacing, bounded retry,
  fallback ladder, timeout, and unit coverage. But the TypeScript `EventSink`
  defaults to a no-op and is not wired in `AppModule`; fallback `degraded`, rung,
  and attempt metadata never reaches `MealLog`/the mobile response. HTTP failures
  become generic 500s without request IDs, metrics, traces, or structured edge
  logs. Idempotency is process-local in unbounded in-memory maps, so restart or
  multi-instance deployment can duplicate work; mobile has no request timeout.
- [ ] **Submission:** Loom remains unrecorded/unhosted. Record from current
  main, show Node/TypeScript boundary, label fixture/demo footage honestly, and
  include review, abstention, error, privacy, and exact scorable-count states.
  Email summary remains undrafted; it needs repository/run commands, current
  offline metrics with the 2/2 denominator, limitations, and explicit
  live/device/deployment non-claims.

## Verified checks

- `git rev-parse --is-shallow-repository` => `false`.
- `python3 scripts/status.py --check` => `STATUS.md matches the repository`.
- `python3 scripts/check_secrets.py --root .` => `secret guard passed: scanned 318 tracked files and added diff lines`.
- Current offline harness and retrieval evaluation were run from
  `/tmp/mealog-codex147.UTTTIM/venv`; no live provider or device call was made.

Traps: do not reuse PR #185's pre-#158 scorecard, quote `12.7%` without its
`2/2` denominator, call demo fixtures live evidence, or claim the Node fallback
state is observable until metadata is carried through the delivered edge.
