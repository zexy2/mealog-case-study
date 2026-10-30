## 2026-08-21 00:32 +03 — claude
Issue:   #8 (claim #27)
Did:     Turned the locale-pack licence declaration into an enforced control.
         `license` in every `pack.yaml` moved from free text to a fixed vocabulary
         (`public-domain`, `permissive`, `restricted-noncommercial`, `unverified`),
         with a derived `commercial_use: allowed | prohibited | unknown` on the
         pack. Added `MEALOG_COMMERCIAL_MODE` to `config.py`, defaulting to off.
         `locales/loader.load()` now refuses a pack whose licence does not permit
         commercial use when that mode is on, raising `RestrictedPackError` naming
         the pack, the licence and the environment variable. `check_invariants.py`
         validates the value against the vocabulary instead of only checking the
         field exists.
Result:  No eval impact, verified rather than asserted: commercial mode defaults
         to off, and the before/after scorecards are byte-identical (`diff` clean
         across all four ablation rows). Tests 20 -> 33. `make eval` still runs
         offline with no key. `tr` is now refused in commercial mode, and so is
         `ja_JP` — its MEXT terms were "public reference; verify before commercial
         use", which is `unverified`, which fails closed.
CI:      Read, not assumed. On the first branch, lint/tests/invariants passed and
         only the scope gate objected, for the PR-body parsing reason in Traps.
         Then `main` moved three times under me (#21 photo contract, #26 portion
         density, #3x taxonomy/tier metrics), so that branch went `mergeable:
         false` on `STATUS.md`. Rebased onto the new tip rather than hand-merging
         a generated file, per AGENTS.md section 4. On the rebased tree: 64 tests
         pass, lint clean, invariants hold, `STATUS.md` matches, no per-cuisine
         regression. My tree differs from `main` only in the files I declared
         plus the `STATUS.md` test count (36 -> 43).
Next:    Two follow-ups I deliberately did not do, both outside this claim.
         (1) `docs/decisions.md` should get the enforcement decision as D9 — the
         text is in the PR body for @zexy2 to append. The file is human-gated by
         AGENTS.md §3 and is being edited under #21, so I did not touch it.
         (2) `scripts/build_locale_pack.py` still takes `--license` as free text,
         so a newly generated pack can fail the invariant it just learned about.
         It should constrain the flag to the vocabulary. Out of scope here.
Traps:   - **A cache in front of a legal control is a way around it.** `load()` was
           `@cache`d. Putting the licence gate inside the cached function means the
           first caller in development warms the cache and every later caller gets
           the pack for free, commercial mode or not. The read is cached; the gate
           is not, and `test_cache_does_not_let_a_restricted_pack_through` exists
           to keep it that way. Do not "simplify" the gate back inside `_read_pack`.
         - **`unverified` is not a soft `permissive`.** It maps to `unknown`, and
           `unknown` is refused. Silence is not permission. An unparseable licence
           string also degrades to `unverified` rather than raising, so a typo
           fails closed instead of reading as consent.
         - The AGENTS.md §3 rule "lowest issue number wins" and the coordinator
           note on #8 disagreed about `server/tests/test_locale_packs.py`: #22
           declares all of `server/tests/`. Resolved by the owner's assignment and
           recorded on both #22 and #27 rather than assumed. If you hit the same
           shape, write it down on both issues — the cost of being wrong silently
           is somebody's work getting clobbered.
         - `scripts/` is linted by CI (`ruff check src tests ../scripts`), which is
           easy to miss when running ruff from `server/`. An unused `# noqa: E402`
           there was the only thing standing between "green locally" and red CI.
         - **The PR template is unparseable by the scope gate it feeds.** The
           template writes `**Closes:** #<issue>`, and
           `check_claim_scope.py`'s `ISSUE_REF` is
           `(?:closes|fixes|resolves|issue)[:\s]+#(\d+)` — the `**` sits between
           the colon and the `#`, so `[:\s]+` never reaches it. Filling the
           template in exactly as written fails CI with "this pull request
           references no claim issue". Put a bare `Closes #N` on its own line.
           Cost me one red CI run; it will cost the next agent one too until
           either the template or the regex is fixed. Both files are outside my
           claim, so this is reported on PR #28 rather than patched here.
         - **Mirroring a moving repository file by file gives a torn snapshot.**
           I had no git credentials, so I rebuilt the tree through the API one
           file at a time. That takes minutes, and other agents merged during it,
           so I ended up with `test_taxonomy_tagging.py` from after a merge and
           `eval/metrics.py` and `domain/taxonomy.py` from before it. The result
           was an ImportError that looked like my bug and was not: `main`'s own CI
           was green the whole time. If a failure implicates a file you never
           touched, check the tip of `main` before you debug it.
