# Onboarding prompt

Give this to every agent as its **first message**, verbatim. Replace `<handle>`
with a short lowercase name unique to that agent (`claude-code`, `cursor`,
`codex`, `gumball`).

Keep it short. A long prompt gets skimmed, and the whole point is that the
agent goes and reads the repository rather than trusting a summary of it.

---

```
You are working on the private repository zexy2/mealog-case-study.
Your agent handle is: <handle>

Several agents work on this repository at the same time and cannot talk to each
other. GitHub is the only shared memory: if something is not in a commit, an
issue, a pull request or a log entry, it does not exist and another agent will
overwrite it.

Before you write anything, in this order:

1. Read AGENTS.md in full. It is the contract, not a style guide.
2. Read STATUS.md. It is generated from the repository and tells you what is
   actually done — do not infer state from the README.
3. Read docs/decisions.md. D1-Dn are binding constraints.
4. List open issues labelled `agent-claim`. Those are live locks held by other
   agents. Do not touch files inside someone else's declared scope.
5. List open pull requests. Someone may already be doing your task.
6. Skim the last few files in log/. The `Traps:` lines will save you time.

Then:

7. Open a claim issue using the "Agent work claim" template. Declare the exact
   files you will modify, in backticks. CI enforces this: a pull request that
   touches anything outside your declared scope fails the build.
8. Work on a branch named agent/<handle>/<topic>. Never commit to main.
9. Open a pull request, fill in the template completely, and state the eval
   impact. A number without a before/after diff is not evidence.
10. Before you finish, add a log entry at
    log/YYYY-MM-DD-HHMM-<handle>-<topic>.md.

Rules that get work reverted: force pushing, rewriting history, editing another
agent's commits or log entries, weakening a test or an invariant to make your
change pass, adding a dependency without justifying it in the pull request,
committing a secret.

Two things this repository has learned the hard way, so do not repeat them:

- Verify dependency changes in a throwaway virtualenv, never your own. Your
  environment already has packages the project does not declare.
- Read the CI result before you claim anything passes. CI was red here for a
  full day while every local check reported green.

Your task: <task, or: pick the highest-priority issue labelled `ready` that is
not blocked and not claimed>
```

---

## Why it is shaped this way

**It sends the agent to the repository instead of describing it.** Any summary
here goes stale the moment someone merges. `STATUS.md` cannot, because it is
generated and CI fails when it drifts.

**It puts the claim before the code.** The most expensive multi-agent failure is
two agents editing the same file, and the only cheap moment to prevent it is
before either starts.

**It names two specific past failures.** Generic warnings get skimmed; "CI was
red for a day while local checks were green" is concrete enough to change
behaviour.

**It does not explain the architecture.** That is what `docs/` is for, and an
agent that will not read `docs/` will not follow this prompt either.
