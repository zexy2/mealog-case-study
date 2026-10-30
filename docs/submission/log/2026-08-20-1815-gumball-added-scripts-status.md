## 2026-08-20 18:15 +03 — gumball
Issue:   (none — tooling, raised by external review feedback)
Did:     Added `scripts/status.py`, which generates `STATUS.md` by probing the
         working tree: does an app project exist, does the vision adapter still
         raise NotImplementedError, does the API accept an image, how many golden
         samples and how many fixtures are still synthetic, how many TODO groups
         remain in the README. Wired a `--check` staleness guard into CI and
         `make check`, and put a pointer to it at the top of the README.
Result:  No eval impact. Two reviewers in a row read the repo and reported the
         missing app and unreal numbers as discoveries; both were known and
         scheduled, but nothing in the repo said so in one place.
Next:    Unchanged — #6, then #3.
Traps:   STATUS.md is generated. Do not hand-edit it; CI compares it against the
         probes and fails. If a probe is wrong, fix the probe. And do not add a
         timestamp to the output — it would make every run a spurious diff.
