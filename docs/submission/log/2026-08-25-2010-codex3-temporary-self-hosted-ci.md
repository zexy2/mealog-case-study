# Session log — temporary self-hosted CI selector

State: The CI workflow can select a trusted self-hosted runner through the `CI_RUNNER` repository variable while retaining `ubuntu-latest` as the default.

Done: Changed runner selection and added a self-hosted-only temporary Python 3.11 virtualenv bootstrap because `setup-python`'s macOS ARM64 installer targets the unwritable hosted-runner path `/Users/runner`. Hosted npm caching remains enabled, while the temporary runner skips restoring the repository's hundreds-of-MiB cache and uses clean `npm ci`. The first executing run also exposed seven pre-existing Ruff violations in `scripts/curate_dataset.py`; these were corrected without changing lint rules or curation behavior. All checkout, install, tests, lint, typecheck, export, scope, status, regression, invariant, and main-history guard commands remain unchanged.

Next: Register a temporary macOS ARM64 runner outside the repository, set `CI_RUNNER=self-hosted`, read the hosted workflow result, then remove the variable and runner when submission verification is complete.

Traps: Never register a self-hosted runner for an untrusted public fork. On macOS ARM64, `setup-python` tries to create `/Users/runner/hostedtoolcache`; use the scoped temporary venv bootstrap rather than granting elevated filesystem access. Do not leave `CI_RUNNER=self-hosted` set after removing the runner or jobs will wait indefinitely. Runner registration tokens and API keys must never be printed, logged, or committed.

Branch: `agent/codex3/temporary-self-hosted-ci`

Commit: See the commit containing this log entry on the branch above.
