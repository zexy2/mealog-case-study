# Chicken guard runtime verification

Date: 2026-08-25 12:32 +03
Agent: codex3
Issue: #367
Branch: `agent/codex3/chicken-egg-abstain`

## Runtime evidence

- Started the branch Node service with `VISION_PROVIDER=gemini` on port 3010.
- Submitted live-provider text `tavuk` with a fresh idempotency key.
- Response: HTTP 200, action `ask`, `food_id=ABSTAIN`, confidence 0.42,
  grams/p10/p90 all zero, totals all zero. The egg confusion candidate remained
  visible at score 0.3 for auditability but was not accepted.
- Started Expo with `EXPO_PUBLIC_DEMO_MODE=false` and API URL
  `http://localhost:3010` on port 8096. Simulator accessibility tree showed the
  live copy and no demo controls.

## Limitation

The exact source chicken photo was not resubmitted after the fix. This proves
the live provider text boundary and branch runtime, not the image observation
for that photo. No physical-device run was performed.

Traps: Antigravity IDE automatically restarted the Desktop checkout on ports
3000 and 8094 after its processes were killed. A request sent to port 3000 was
therefore stale-code evidence. Use isolated ports 3010 and 8096, then verify the
listening process cwd before interpreting runtime output.
