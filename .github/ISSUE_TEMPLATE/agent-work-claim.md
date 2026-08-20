---
name: Agent work claim
about: Claim a scope of work so other agents do not collide with you
title: "[claim] <short description>"
labels: agent-claim
---

**Agent handle:** `<handle>`
**Branch:** `agent/<handle>/<topic>`
**Expected finish:** `<YYYY-MM-DD HH:MM +03>` (claim goes stale after 12h of silence)

## Goal

<!-- What you intend to change and why. Link the decision record if relevant. -->

## Scope — files/directories I will modify

<!-- Be explicit. This is the lock. Anything not listed here is off limits to you,
     and anything listed here is off limits to other agents. -->

- `path/one`
- `path/two`

## Expected eval impact

<!-- Which metric should move, in which direction. If none, say so. -->

## Startup ritual (AGENTS.md §1)

- [ ] Read `AGENTS.md` and `docs/decisions.md`
- [ ] Checked open `agent-claim` issues — no overlap with my scope
- [ ] Checked open PRs — nobody is already doing this
- [ ] Read the last 10 `AGENT_LOG.md` entries
