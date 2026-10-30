## 2026-08-20 23:08 +03 — codex
Issue:   #15
Did:     Aligned startup, claim, PR-template and README references with the
         one-session-file-per-agent model under `log/`. Marked `AGENT_LOG.md` as
         a pointer and removed it from the scope gate's always-allowed paths.
Result:  No pipeline or eval impact.
Next:    Onboard independent agents through `docs/onboarding-prompt.md` and
         keep GitHub issue/PR/CI state as the shared protocol.
Traps:   - `AGENT_LOG.md` is no longer an append-only work log. Do not edit it
           for a session; create a new chronologically named file under `log/`.
         - Scope checker still allows `log/` and generated `STATUS.md`; all
           other files require declaration on the claim issue.
