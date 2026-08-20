# Agent log

Entries live in [`log/`](log/), **one file per session**. Do not append to or edit
this pointer; create a new session file under `log/` instead.

They used to be appended to this file. With several agents working in parallel
that guarantees a merge conflict on every pull request, and a conflict on the
log is the one conflict nobody resolves carefully. One file per session never
collides.

## Writing an entry

Create `log/YYYY-MM-DD-HHMM-<handle>-<topic>.md`:

```
## YYYY-MM-DD HH:MM TZ — <handle>
Issue:   #<n>
Did:     <what changed>
Result:  <eval impact, or "no eval impact">
Next:    <what you would do next>
Traps:   <what will bite the next agent>
```

Never edit somebody else's entry. If they were wrong, write your own saying so.

## Reading

Filenames sort chronologically, so `ls log/` is the timeline. Start from the
bottom. For current state rather than history, read [`STATUS.md`](STATUS.md).
