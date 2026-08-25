# Session log — temporary self-hosted CI selector

State: The CI workflow can select a trusted self-hosted runner through the `CI_RUNNER` repository variable while retaining `ubuntu-latest` as the default.

Done: Changed runner selection only. Existing checkout, install, tests, lint, typecheck, export, scope, status, regression, invariant, and main-history guard steps remain unchanged.

Next: Register a temporary macOS ARM64 runner outside the repository, set `CI_RUNNER=self-hosted`, read the hosted workflow result, then remove the variable and runner when submission verification is complete.

Traps: Never register a self-hosted runner for an untrusted public fork. Do not leave `CI_RUNNER=self-hosted` set after removing the runner or jobs will wait indefinitely. Runner registration tokens and API keys must never be printed, logged, or committed.

Branch: `agent/codex3/temporary-self-hosted-ci`

Commit: See the commit containing this log entry on the branch above.
