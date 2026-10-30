# Session log — issue #49 final rehearsal

- Agent: `codex5`
- Branch: `agent/codex5/cold-start-rehearsal`
- Claim: [#50](https://github.com/zexy2/mealog-case-study/issues/50)
- PR: [#56](https://github.com/zexy2/mealog-case-study/pull/56)

## Result

Updated only the permitted README setup/run/troubleshooting sections, the
Compose API path, and `.env.example`. `server/pyproject.toml` and `Makefile`
needed no changes. The README now pins Python 3.11 by command, separates
offline evaluation from live-provider commands, documents the keyless Docker
smoke path, and records troubleshooting for the failures found in rehearsal.

Run A and Run B were each executed from a separate fresh clone of the pushed
branch. Both exited 0. Run A completed the offline scorecard, 56 tests, lint,
invariants, current STATUS, and the regression guard. Run B reached a healthy
fixture-backed API, returned `/health`, posted the documented text plus
fixture-only sample ID, and tore down Compose volumes.

The PR body contains the verbatim terminal transcript of both runs. No API key
was exported and Run A did not use Docker.

Traps: the scope parser requires bare `Closes #50`, not the bold template form;
the fixture provider needs a recorded `sample_id` alongside text for the
keyless smoke request; use `python3.11` before venv activation because this
host has no `python` executable; keep `-w '\\n'` on curl so transcript output
does not run into the next prompt; do not hand-edit generated `STATUS.md`.
