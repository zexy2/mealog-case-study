# AGENTS.md — rules for AI agents working in this repository

**This file is the contract. Read it fully before your first write.**

Multiple AI agents and one human (@zexy2, the owner and final arbiter) work in this
repo. GitHub is the only shared memory: if a decision, claim or result is not in a
commit, issue, PR or log entry, **it does not exist** and another agent will
overwrite it.

---

## 1. Startup ritual — mandatory, in this order

Before you write a single line, do all five:

1. Read this file and `docs/decisions.md`. Decisions D1–Dn are binding constraints,
   not suggestions.
2. `git fetch --all && git log --oneline -20` on `main`.
3. List **open issues** labelled `agent-claim` — these are active locks held by
   other agents. Do not touch files inside someone else's claimed scope.
4. List **open pull requests**. Another agent may already be doing your task.
5. Read the last 10 entries of `AGENT_LOG.md`.

If your intended work overlaps an existing claim: comment on that issue and
negotiate. Do not start.

---

## 2. Identity — always declare who you are

Every agent has a stable handle, lowercase, e.g. `gumball`, `claude-code`, `cursor`.

- Branch: `agent/<handle>/<short-topic>` — e.g. `agent/gumball/retrieval-bm25`
- Commit trailer on **every** commit:
  ```
  Agent: <handle>
  Issue: #<number>
  ```
- Never commit under another agent's handle.

---

## 3. Claiming work — issues are locks

There is no other locking mechanism. Respect it or agents will clobber each other.

1. Open an issue using the **Agent work claim** template.
2. Label it `agent-claim`. State your handle, the **scope** (explicit list of files
   or directories you will modify), and your expected finish time.
3. Work only inside your declared scope. Need more? Edit the issue first.
4. Close the issue when the PR merges.

**Claim TTL: 12 hours.** A claim with no commit or comment for 12 hours is stale.
Any agent may label it `stale-claim`, comment saying it is taking over, and proceed.
Do not silently seize a live claim.

**Unclaimable without human sign-off:** `docs/decisions.md` (append-only, see §6),
`AGENTS.md`, `.github/workflows/`, and anything under `eval/golden/`. Golden-set
labels are ground truth; changing them changes every historical number.

---

## 4. Branch and PR discipline

- **Never commit directly to `main`.** Every change is a PR.
- One issue → one branch → one PR. Keep PRs small enough to review in 10 minutes.
- Fill in the PR template completely. A PR that does not state its **eval impact**
  will not be merged.
- Rebase onto `main` before requesting merge. Resolve your own conflicts.

---

## 5. Hard rules — violating these is a revert, no discussion

1. **No force push. No history rewrite. No amending another agent's commit.**
2. **Do not delete or rename another agent's branch.**
3. **Do not revert another agent's merged decision.** Disagree in an issue and let
   the human decide.
4. **No secrets in the repo.** No API keys, no `.env`, no user photos. Fixtures only.
5. **Do not weaken a test or an invariant to make your change pass.** If an
   invariant is wrong, change it in a separate PR with its own justification.
6. **Do not add a dependency without a one-line justification in the PR body.**

---

## 6. Append-only artifacts

`docs/decisions.md` and `AGENT_LOG.md` are **append-only**. Add at the bottom.
Never edit or delete an existing entry — supersede it with a new one that references
the old one by number. History of reasoning is the point.

End every working session with an `AGENT_LOG.md` entry. That is how the next agent
learns what happened without reading every PR.

---

## 7. Merge gate

A PR merges only when all of these are green:

```
make test                                  # unit tests
make lint                                  # ruff
python eval/harness.py --check-regression  # no cuisine bucket got worse
python scripts/check_invariants.py         # architectural rules still hold
```

CI runs all four. If you changed pipeline behaviour, also paste the before/after
ablation rows into the PR body. **A number without a diff is not evidence.**

---

## 8. Handoff protocol

Stopping mid-task (out of context, blocked, timed out)? Before you go, comment on
your claim issue with:

```
HANDOFF
State:    <what works right now>
Done:     <what is finished and merged/pushed>
Next:     <the exact next step>
Traps:    <what bit you; what the next agent should not repeat>
Branch:   <branch name and last commit sha>
```

Then either keep the claim (if returning within TTL) or label it `stale-claim`
yourself so another agent can pick it up. Silent abandonment is the worst outcome.

---

## 9. Project invariants — do not break these

These come from `docs/decisions.md` and are enforced by `scripts/check_invariants.py`:

| Invariant | Why |
|---|---|
| Only `pipeline/nutrition.py` produces nutrient numbers | the anti-hallucination guarantee is architectural, not prompt-based |
| No locale name appears as a literal in `pipeline/` or `domain/` | a market is data; hardcoding one makes market N+1 a code change |
| Every locale pack declares a `license` | packs have different legal terms (TURKOMP is restricted) |
| Every golden sample has a matching fixture | `make eval` must run offline for anyone |
| Resolution returns a catalogue `food_id` or `ABSTAIN`, never free text | closed-set is what makes hallucination impossible |

## 10. Where things live

| Looking for | Go to |
|---|---|
| Why something is the way it is | `docs/decisions.md` |
| How accuracy is measured | `docs/evaluation.md` |
| What was trained and what was not | `docs/finetuning-plan.md` |
| How to add a market | `scripts/build_locale_pack.py`, `locale_packs/` |
| What other agents did | `AGENT_LOG.md`, closed issues, merged PRs |
| Current scores | `make eval` → `eval/reports/scorecard.md` |
