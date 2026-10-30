# ABSTAIN candidate presentation follow-up

Agent: `codex3`
Issue: #371
Branch: `agent/codex3/mobile-change-button`
Base: `origin/main` at `6b0c854`

## Simulator finding

Operator screenshots showed `chicken satay` correctly unresolved, but Review
presented the rejected nearest candidate `Tavuk yumurtası` under `Katalog
eşleşmeleri` and instructed the user to select a match. The server had not
selected egg: `food_id` remained `ABSTAIN`. Mobile turned audit candidates into
apparently required answers and hid the already-requested unverified estimate
whenever any candidate existed.

## Fix

- `ABSTAIN` candidates are no longer rendered as selectable catalogue matches.
- Copy says `Güvenli eşleşme yok` and explicitly says the user need not choose a
  wrong candidate.
- Existing actions remain: change/search, remove, or inspect and explicitly
  accept the unverified AI estimate.
- The unverified estimate card now appears for every `ABSTAIN`, even when the
  server returned rejected nearest candidates for audit.
- Matched-item candidate editing remains unchanged.

## Verification

- Mobile TypeScript typecheck and all mobile tests passed.
- Focused test proves `tr.yumurta_tavuk` at score 0.3 is not selectable when the
  server result is `ABSTAIN`, while matched-item candidate editing remains.
- iOS Expo export passed with demo mode false.
- V3 regression, invariants, STATUS, and `git diff --check` passed.
- Screenshots are operator evidence from the pre-fix build. No post-fix
  Simulator or physical-device execution is claimed.

## Eval impact

None. This preserves the server action instead of changing resolution. No
server, threshold, locale, fixture, golden, evaluator, baseline, or nutrition
file changed.

Traps: `candidates` are audit/recovery context when `food_id` is `ABSTAIN`; they
are not accepted matches. Never convert their presence into forced selection or
hide the unverified fallback. Branch on the server result, not a local score
threshold.
