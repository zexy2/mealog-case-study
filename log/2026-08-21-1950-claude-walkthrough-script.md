# Walkthrough script — correction and completion pass

Agent: `claude`
Issue: #118
Claim: #170
Branch: `agent/claude/walkthrough-script`
Base: `origin/main` at `f465655`

## Change

`docs/walkthrough.md` already carried the correct nine-segment 8:00 structure
from `codex5`'s PR #129, merged earlier today. This is a correction and
completion pass on that script, not a second rewrite — the structure, the
run-of-show table, the per-segment Picture / Say / On-screen-proof shape and
the final edit checklist are all kept.

Corrected:

- **`n=9` removed, twice.** `STATUS.md`, `eval/golden/manifest.jsonl` and
  `eval/fixtures/` all agree the golden set is now **80** samples with 80
  recorded fixtures.
- **`pipeline/nutrition.py` removed** as on-screen proof. Nutrition is on
  `main` in TypeScript, and the script's own rule says not to show a Python
  terminal. The script now cites no Python file at all.
- **PENDING markers narrowed.** Several said "the ported backend" was pending.
  Wave 1 and the adapters are merged; what is genuinely missing is the meal
  endpoint — `server/src/app/` still holds only the app module and the health
  controller — so the markers now name that specifically.

Added, because #118 asks for them and all three exist in the app:

- **Photo selection alongside capture** (`CameraView` plus the library button).
- **The analysing states**, named as the three real stages: reading, matching,
  portion.
- **The "Why this result?" audit panel** — matched `food_id`, source database,
  confidence, exact grams, and the alternates considered. This is the strongest
  thirty seconds in the review segment and was entirely absent.
- **Partial-truth evaluation** as a spoken limitation: not every sample can be
  scored for calories, so the row count behind an accuracy figure is smaller
  than the headline sample count.

## Verification

- `git diff --check` — clean, no whitespace errors or conflict markers.
- `python scripts/status.py --check` — `STATUS.md matches the repository`.
- One file changed: `docs/walkthrough.md`, +255/−167.
- Nine segments present with the exact timings from #118, summing to 8:00.
- Seven `<!-- PENDING -->` beats: mobile-against-ported-endpoint, device proof,
  the `POST /v1/meals` edge, the method card, the scorecard refresh, the Node
  request validator, and the scorable-count figure.

## Traps

**The script was already rewritten and merged; the task issue was still open.**
PR #129 closed claim #121, not issue #118, so #118 still reads `ready` while
the work behind it is on `main`. Check whether a task issue's *claim* was
closed by a merge before assuming the task is untouched — otherwise you rewrite
a merged file from scratch and destroy someone else's reviewed work for no
reason. The correct move here was a diff against what shipped, not a blank page.

**`docs/evaluation.md` is stale relative to the manifest and this is not mine
to fix.** It describes an `n=25` run throughout; the manifest, `STATUS.md` and
the fixture directory all say 80. Any accuracy, coverage or MAPE figure taken
from that document today would be a superseded number read aloud as a current
one — the precise failure this script exists to prevent. Every result beat is
therefore `<!-- PENDING -->` and the script speaks only counts that three
sources agree on. `docs/evaluation.md` belongs to claim #137; flagged there and
in the pull request rather than edited here.

**`git init` can fail silently enough to make a required check a no-op.** The
first attempt hit `detected dubious ownership`, and `git diff --check` printed
nothing and exited 0 — which reads exactly like a pass. It had not run at all.
The grep-based checks in the same block *did* run, which made the output look
healthy. If a verification step is required, confirm it actually executed
before reporting it; a check that silently did nothing is worse than a failing
one, because it is quieter.

**Sample counts move fast right now.** The golden set went 9 → 25 → 80 inside a
day. Anything written into a script as a number needs a source that can be
re-read at recording time, which is why this version carries a short
"what is safe to say out loud" table with the file each figure comes from,
rather than scattering numbers through the narration.

**The scope gate binds a claim on the word "issue", anywhere in the PR body.**
My first pull request body said `#129 closed claim #121 rather than task issue
#118`, and the gate read `issue #118` as a second claim reference:

```
FAIL: this pull request references multiple distinct claim issues: #170, #118.
```

`check_claim_scope.py` anchors on `closes|fixes|resolves|issue` and rejects a
body binding more than one. The failure is correct and the wording was mine —
prose that happens to put the word "issue" in front of a number is
indistinguishable from a deliberate reference. Say "the task ticket" instead,
and run the gate's own regex over the body before opening the pull request
rather than after CI tells you. Editing the body does not re-run the workflow
on its own; it needs a new commit.
