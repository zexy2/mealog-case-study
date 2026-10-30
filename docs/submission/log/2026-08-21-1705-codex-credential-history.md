# Credential history audit

- Issue: #116
- Claim: #119
- Branch: `agent/codex/credential-history`
- Base: `origin/main` at `263c159`
- Scope: `log/` only
- Result: clean; no source, fixture, manifest, workflow, or documentation change

## Evidence

The audit ran in fresh clone `/tmp/mealog-history.zWanoF`. It is non-shallow:
`git rev-parse --is-shallow-repository` returned `false`; `HEAD` and
`origin/main` each contain 45 commits, and all fetched refs contain 181 commits.
PR head refs, branch refs, and tags were fetched before scanning.

Required scans:

- `git log -p --all | grep -nE 'AIza[0-9A-Za-z_-]{35}'`: no output, grep exit 1.
- The generic assignment scan returned only dependency names, detector regexes,
  variable names, synthetic test fixture interpolation, application plumbing,
  blank `.env.example` placeholders, and `${{ secrets.GITHUB_TOKEN }}` references.
  It returned no credential value.
- Historical additions contained `.env.example` only; no tracked `.env`.
- All referenced blob contents were scanned for the Google key pattern; no match.
- `git fsck --full --no-reflogs --unreachable` returned no unreachable objects.
- `.env` is ignored by `.gitignore:5`; `.env.example` contains an empty
  `GEMINI_API_KEY` placeholder and non-secret runtime defaults.

The full command output was posted to issue #64. The first comment had a manual
transcription error in the long generic-scan tail; two follow-up comments clearly
supersede it, with the final one machine-capturing stdout verbatim:

- https://github.com/zexy2/mealog-case-study/issues/64#issuecomment-5370842752
- https://github.com/zexy2/mealog-case-study/issues/64#issuecomment-5370856208
- https://github.com/zexy2/mealog-case-study/issues/64#issuecomment-5370867265

No purge, history rewrite, `git filter-repo`, BFG, `git gc --prune`, or force-push
was run. Provider-side key rotation remains sensible submission hygiene, but the
repository has no credential history to purge.

Traps: `git log --all` is only meaningful here after fetching PR and branch refs;
a shallow clone can falsely report clean. The generic grep is intentionally noisy:
detector code and synthetic test strings are not credentials. Never paste a match
from a real secret-shaped scan; report only its SHA, path, and line.
