# Full credential-history audit

Agent: `codex5`
Issue: #116
Claim: #241
Branch: `agent/codex5/credential-history-audit`
Base: `origin/main` at `6b05422dfdc4e29d0d77e833637f2c9f5fd7235f`

## Conclusion

No credential value was found. The key-shaped scan found zero matches in
patches or blobs, including `log/` and `docs/`. Four findings from the
repository's exact secret-guard algorithm are reported and triaged below; they
are low-entropy status/test sentinels rather than credentials. No purge,
history rewrite, deletion, or force-push was run.

## Clone and ref coverage

The audit used a fresh mirror clone, then fetched both PR ref families:

```text
git clone --mirror https://github.com/zexy2/mealog-case-study.git <audit>/repo.git
git -C <audit>/repo.git fetch origin \\
  '+refs/pull/*/head:refs/pull/*/head' \\
  '+refs/pull/*/merge:refs/pull/*/merge'
```

Sanitized mirror inventory (no source lines or candidate values were emitted):

```text
HEAD 6b05422dfdc4e29d0d77e833637f2c9f5fd7235f
refs_scanned=190 branches=97 tags=0 pull_refs=93
history_commits_all_refs=393 history_commits_main=209 shallow=false
object_database_objects=2347 object_database_blobs=860 reachable_blobs=860 unreachable_blobs=0
fsck_unreachable_objects=0 fsck_unreachable_types={}
```

`git rev-list --all --objects` covered every object reachable from every fetched
branch, tag, and PR ref. `git cat-file --batch-all-objects` then scanned all 860
blob objects in the mirror. `git fsck --full --no-reflogs --unreachable
--no-progress` found no additional unreachable objects.

## Key-shaped and history scans

The following were counted without printing matching lines or substrings:

```text
git_log_patch_google_and_other_key_hits=0
blob_scan_key_hits={}
blob_scan_log_docs_key_hits={}
log_docs_blobs_scanned=199
```

The key scanner included the exact Google pattern `AIza[0-9A-Za-z_-]{35}` and
additional common provider/key forms (OpenAI, GitHub, AWS, Slack, GitLab, and
private-key delimiters). The patch scan followed the issue's `git log --all -p`
shape; its output was reduced to counts so a match could never print a secret.

The generic assignment triage scanned every blob for the issue's
`api[_-]?key|secret|token|bearer` assignment shape. It produced only code,
configuration-reference, placeholder, empty, and documentation noise; no
high-entropy sensitive assignment survived the exact repository guard below.

## Exact repository guard replay and triage

The committed `scripts/check_secrets.py` algorithm was replayed over all 860
historical blobs, including `log/` and `docs/`:

```text
exact_guard_algorithm_blob_count=860
exact_guard_algorithm_findings=4
historical_tracked_env_paths=NONE
```

The four guard findings are not credential values. They are listed with the
introducing commit, path, and safe metadata; values are deliberately omitted:

| Introducing commit | Path:line | Guard reason | Safe triage |
|---|---|---|---|
| `52b0f27c8cc1c2f92a7094d8810eacb4c7617e69` | `log/2026-08-21-1727-codex-locale-loader-config.md:41` | non-placeholder `GEMINI_API_KEY` assignment | 6-character, non-key-shaped, non-high-entropy status/fixture sentinel |
| `9facf48e2f8522e6f44ae5145c011b9292bdd3ad` | `log/2026-08-23-0300-codex3-e2e-acceptance.md:6` | non-placeholder `GEMINI_API_KEY` assignment | 7-character presence-status sentinel; no key pattern or entropy finding |
| `f911345ea14b68c50d1a2c681a98b24c85107827` | `log/2026-08-23-0405-codex3-toy-rerun.md:5` | non-placeholder `GEMINI_API_KEY` assignment | same 7-character presence-status sentinel in an explicitly unrecorded/redacted context |
| `610c031b11fe414aab8c31d0c1166a979132ab64` | `server/tests/test_secret_guard.py:31` | non-placeholder `GEMINI_API_KEY` assignment | synthetic test construction; concatenation, 14-character result, non-key-shaped and non-high-entropy |

These are guard false positives caused by the guard's deliberately strict
`GEMINI_API_KEY` non-placeholder branch. None is a provider credential, and no
value was printed.

## `.env` and example checks

Historical additions were enumerated with the issue's all-ref command shape:

```text
git log --all --diff-filter=A --name-only --pretty=format:
historical .env-like added paths: .env.example only
historical tracked env files under the guard definition: NONE
```

The current `.gitignore` has an environment-file rule at line 5. The current
`.env.example` has four assignments; its `GEMINI_API_KEY` entry is accepted by
the exact guard's placeholder logic, does not match the Google key pattern, and
does not meet the high-entropy threshold. The clean current-main tree also
passed the committed guard:

```text
secret guard passed: scanned 351 tracked files and added diff lines
```

No `.env` file (as distinct from `.env.example`) was ever added on any fetched
ref.

## Independent structural audit

For a read-only code-relationship cross-check, graphify scanned a temporary
archive of `scripts/` and `server/src/` only. It found 53 code files, 643 nodes,
1,273 edges, and 35 communities. The graph artifacts were written under
`/tmp`, not this repository; this did not replace the direct blob/history
evidence above.

## Verification boundary

- No provider key was requested or used.
- No repository source, fixture, baseline, evaluator, or decision file changed.
- `eval/reports/baseline.json` was not touched.
- The only intended repository change is this session log.

Traps: A current-tree scan is insufficient for this gate. The decisive evidence
is the non-shallow mirror with fetched branch/PR refs, all-blob scan, unreachable
object check, and explicit triage of the four strict-guard false positives.
