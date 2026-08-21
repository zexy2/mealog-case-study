# Wave 2a — vision adapters, Gemini and fixture replay

Agent: `claude`
Issue: #145
Claim: #153
Branch: `agent/claude/port-vision-adapters`
Base: `origin/main` at `81309f7`

## Change

Ported `adapters/vision_gemini.py` and `adapters/vision_fixture.py` to
`src/adapters/`. Both implement `VisionPort`. Constants, the system prompt, the
response schema, the retry/fallback ladder, the 4-second pacing and the fixture
payload shape all carry across unchanged.

Two things decide this module and both are tested directly:

- **Content-hash keying.** An image input resolves by the SHA-256 of its bytes.
  When bytes are present `sample_id` is not consulted at all.
- **D1 at the boundary.** A response carrying a nutrition field is rejected,
  not accepted with the field dropped.

The Gemini model id stays configuration-driven (`GEMINI_MODEL`, default
`gemini-flash-lite-latest`), so D10's Lite/full-Flash split remains switchable.
Provider I/O goes through an injected transport; tests never make a live call
and no key exists anywhere in the suite.

## Parity

Compared against a dump of the Python adapters at four levels, all exact:

| Level | Compared | Mismatches |
|---|---:|---:|
| Constants, prompt, schema, status sets | 18 | 0 |
| D1 parse boundary, case by case | 11 | 0 (identical error strings) |
| Fixture key selection | 3 input shapes | 0 |
| Replay of every committed fixture | 25 files / 83 observations | 0 |

V0–V3 scorecard unchanged: `sha256 4ee38f55…ff59` with and without the three
new files, zero lines differing across a 170-line, 120-row scorecard. Python
gates untouched: ruff clean, 249 passed, invariants hold, status current, no
per-cuisine regression. Secret guard passed over 303 tracked files.

## One intentional strengthening

The Python fixture adapter constructs observations without validating them; the
TypeScript one runs recorded items through the same D1 check a live response
gets, because a fixture *is* a recorded provider response. All 25 committed
fixtures pass unchanged — verified before making the change — so the only
behaviour difference is that a tampered fixture is rejected instead of silently
stripped. Flagged in the PR so it can be reverted in one line if the reviewer
would rather have a literal port.

## Traps

**When image bytes are present, `sample_id` must not be a fallback.** The
useful test is the negative one: put a valid fixture at `sample_0001.json`,
hand the adapter bytes whose hash has no fixture, and require it to fail. A
fallback here would let a mislabelled photograph replay someone else's
recording and still show green — offline replay would keep "working" while
measuring the wrong thing. I checked the Python behaviour before asserting it
rather than assuming from the docstring.

**The forbidden-field check has to run before the unknown-field check.** Both
fire on a response carrying `kcal`, and whichever runs first writes the error
message. "Unknown field: kcal" is a shrug; "forbidden nutrient field: kcal" is
a D1 violation someone can act on. Order is behaviour here, not style.

**Python's `parents[4]` does not port to a fixed number of levels.** The
module runs from `src/adapters/` under the test runner and from
`dist/src/adapters/` after a build, so a constant depth is wrong in one of
them. Walk up for the `eval/fixtures` directory itself. Related: compiling the
adapter to a scratch directory *outside* the repository breaks the default
resolution entirely — that is a harness artifact rather than a defect, but it
cost me a run of 25 confusing failures. Pass the directory explicitly when
compiling out of tree; the constructor takes one, exactly as Python's does.

**`git add -A` still sweeps `server/dist/` into the index.** `dist/` is not in
`.gitignore` — the gap flagged in the Wave 0 log, still open, and
`apps/mobile` has it too. Worse, it made my first eval-impact check
meaningless: my files were already committed, so `git stash -u` had nothing to
stash and I "measured" the tree against itself and got a clean diff. A diff of
something against itself is not evidence. Take the before side by actually
removing the files under test.

**Do not put a realistic-looking key in a test.** `test-key` is low-entropy and
obviously fake. The CI secret guard rejects Google key shapes and high-entropy
values assigned to KEY/TOKEN/SECRET names, and it is easier to keep it happy
than to argue with it. The recording test also asserts the written fixture
contains no key, no `x-goog-api-key` header, no image bytes and no response
envelope.

**`model_dump(exclude_none=True)` omits nulls and follows pydantic field
declaration order.** The fixture files on disk are the contract for 25 recorded
responses; a reordered or newly-present key changes them. The port matches
field for field, which the parity harness checks rather than trusts.

**Script modes, again.** Only the three scripts carrying a shebang may be
executable — `chmod +x scripts/*.py` turns ruff's `EXE001` into `EXE002`. Same
trap as the Wave 1 log; I hit it there and avoided it here by scripting the
rule instead of remembering it.
