# README stale-claim cleanup

Agent: `claude`
Issue: #100
Claim: #101
Branch: `agent/claude/readme-stale-claims`
Base: `263c159` (`origin/main`)

## Change

`README.md` only. `STATUS.md` on `main` reports `Real vision provider | working |
9 recorded non-synthetic provider response(s)` and `0/9 fixtures still
synthetic`, but the README still told a reviewer the fixtures were synthetic in
three separate places and listed live-provider fixtures and real labels among
the things that were cut. That is a false claim about work another agent already
landed.

- Brief table: the accuracy row no longer says the fixtures are synthetic; the
  end-to-end row now separates recorded provider responses from the
  device-to-live-provider path.
- Testing: dropped `currently runs 80 tests`. The number was already wrong \u2014
  `log/` records runs of 85, 91, 93 and 249 since it was written \u2014 and any
  replacement number would rot the same way, so the section now points at the
  count the run itself prints.
- Known limitations: fixtures are described as recorded but keyed by
  `sample_id` rather than image content hash, which is exactly why
  `probe_photo_ingest` still reports partial. Names D10's incomplete full-Flash
  strip and attributes the held confidence gate to D11.
- With more time: reordered around what is actually left. Item 1 was "replace
  synthetic fixtures and labels", which has landed.
- Time spent & scope: live-provider fixtures and source-backed labels moved out
  of the "cut" list.

No golden-set size is hard-coded anywhere in the file. PR #95 is still rebasing
its growth from 9 to 25; the README should not need a follow-up edit when it
lands, and Results stays empty until #57.

## Not touched

`<!-- RESULTS: filled by #57 -->` and the top demo placeholder are byte-identical.
No `STATUS.md`, `docs/decisions.md`, `eval/`, manifest, fixture or pipeline
change. No metric added. No dependency added. The interview answers from #92
were left alone.

## Verification

No clone credential was available in this environment, so `make check` could not
be executed here; this is stated plainly rather than implied. What was verified
mechanically against the exact committed bytes:

- `scripts/status.py::probe_writeup` is the only probe that reads `README.md`.
  It derives its evidence string from `re.findall(r"TODO\(", readme)` and the
  `docs/*.md` count. Both are unchanged (1 and 6), so `render()` returns the
  same bytes and `python scripts/status.py --check` cannot newly fail. Replayed
  the probe over both README versions: both yield
  `README + 6 documents; 1 section group(s) still TODO`, which is the line
  already committed in `STATUS.md`.
- `git diff --check` equivalents on the new file: no trailing whitespace, no
  tabs, no conflict markers, single trailing newline.
- The Results section between `## Results` and `## Interview answers` is
  byte-identical to `main`.
- The set of percentages in the file is unchanged, so no numeric accuracy claim
  was introduced.
- No pipeline, fixture or manifest file is in the diff, so the harness
  regression guard and `check_invariants.py` have nothing new to read.

## CI result

Run [32480740956](https://github.com/zexy2/mealog-case-study/actions/runs/32480740956),
`pull_request`, head `755c8c41` — success. Read from the job log, not the badge:

| Gate | Result |
|---|---|
| secret guard | `scanned 166 tracked files and added diff lines` |
| lint | `All checks passed!` |
| tests | `249 passed in 2.98s` |
| invariants | passed |
| claim scope | `scope OK — all changes within issue #101 (2 declared path(s))` |
| status | `STATUS.md matches the repository` |
| eval regression | `no per-cuisine regression in V3` |

`STATUS.md matches the repository` confirms the byte-identical reasoning above.
`249 passed` confirms the README's `80 tests` was not slightly stale but wrong by
169.

## Follow-up left for someone else

The Reliability row still reads `durable storage and degradation are omitted`,
and "With more time" still lists adding the provider degradation ladder. The
`codex` log for #3 mentions keeping "#66's Gemini degradation ladder", so one of
those two may also be stale. I did not change it: confirming it means reading
adapter and pipeline code that is outside this claim, and guessing at it would
just swap one unverified sentence for another. Worth its own issue.

Traps: `README.md` is not a free-text file. `scripts/status.py::probe_writeup`
counts `TODO(` occurrences in it, so adding or removing one silently makes
`STATUS.md` stale and reds the build on a file you never opened \u2014 and both open
PRs (#95, #39) already carry `STATUS.md` edits, so a third one is a guaranteed
conflict on the one generated file nobody merges carefully. Keep the count fixed
and the generated file stays byte-identical. Second trap: do not put a
golden-set size or a test count in this README. Every hard-coded count in it has
gone stale within a day, and the two that were there had both already been
contradicted by `STATUS.md` and by `log/` before anyone noticed.
