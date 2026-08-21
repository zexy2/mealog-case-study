# Wave 1 — retrieval port, in-house TF-IDF

Agent: `claude`
Issue: #125
Claim: #133
Branch: `agent/claude/port-retrieval`
Base: `origin/main` at `af59065`

## Change

Ported `pipeline/retrieval.py` to `src/pipeline/retrieval/`, replacing
`scikit-learn` with an in-house implementation of the two `TfidfVectorizer`
configurations it used: word 1–2 grams and `char_wb` 3–5 grams, binary,
un-normalised, smooth IDF.

The scoring layer is a straight port. D6 is settled and was not reopened:
IDF-weighted asymmetric coverage, `W_CHAR` 0.55 / `W_WORD` 0.45,
`CONFUSION_SCORE` 0.30, `MIN_SIGNAL` 0.15, all read from the Python source.
The index cache is keyed on a SHA-256 of the pack content, never mtime.

`fold` and `LocalePack` belong to #122 and #127, which are unclaimed and not on
`main`. Retrieval takes `fold` through a dependency seam and types the pack
structurally with the Python field names, so it compiles and tests standalone
and will accept the real modules unchanged.

## Parity

The retrieval scorecard was regenerated with the TypeScript implementation
substituted into `eval/retrieval_eval.py`. It is byte-identical to the Python
one — `sha256 01d97e60…9159` on both sides. Recall@1 100.0%, Recall@5 100.0%,
MRR 1.000, Accept@1 99.2%, false accepts 0/22, all confusion cases correct.

Below the aggregate: 96 analyzer samples, every vocabulary term in all three
packs, and all 158 query variants compared against a dump of the live sklearn
behaviour. Zero mismatches. Float drift is 4.441e-16 on both IDF and the
unrounded similarity, and exactly 0 after `round(x, 3)`.

V0–V3 scorecard unchanged, `sha256 f376607c…b434` before and after. No Python
file was touched.

## Traps

**Read sklearn's defaults out of the running library, not out of memory.**
Three of them change results and none is obvious: `token_pattern` drops
single-character tokens, `smooth_idf=True` makes the formula
`ln((1+n)/(1+df))+1` rather than `ln(n/df)`, and `char_wb` pads every word with
spaces and emits a word shorter than `n` exactly once. I dumped `get_params()`
and `build_analyzer()` output and diffed against them instead of implementing
from the documentation. Two of the three I would have got wrong.

**JavaScript's `\b` is ASCII-only, even with the `u` flag.** Transliterating
`r"(?u)\b\w\w+\b"` directly splits `çorbası` and `餃子` in places Python does
not, and the damage is invisible until per-cuisine recall moves. Match maximal
`[\p{L}\p{N}_]+` runs of length ≥ 2 instead — that is what the Python pattern
selects anyway.

**Python's `round()` is half-to-even on the true binary value; `Math.round`
and `toFixed` are neither.** `round(0.3125, 3)` is `0.312` in Python and
`0.313` from a naive port. Scores are rounded *before* ranking, so this is a
behaviour difference, not a formatting one. No exact tie occurs in the current
catalogue — the two values that look like ties are `0.8625`, whose double is
`0.86250000000000004…` and therefore above the midpoint — but the catalogue
grows every day and the next one will not be so forgiving.

**Do not `chmod +x scripts/*.py`.** I did, to clear the `EXE001` noise the
Wave 0 log warns about, and turned it into five `EXE002` errors instead. Only
the three scripts that actually carry a shebang should be executable; the
other five must not be.

**A fixture can invent a tie, and the port is not necessarily what is wrong.**
My first token-boundary fixture gave the cauliflower entry the alias
`cauliflower rice`, which puts the whole token `rice` into its document, so
both foods covered the query completely and tied at 1.0 — ranking then falls
to `food_id` ascending and cauliflower won. I ran the identical fixture through
the Python module before touching anything: it returned the same tie. The port
was right and the test was wrong. Check a surprising result against the
reference implementation before you "fix" the implementation to match your
expectation.

**The evidence scripts are not part of the change.** `probe_reference.py`,
`retrieval_eval_ts.py` and the fixture cross-check live in `/tmp`, not in the
repository. They are reproducible from this log entry and the PR body, and
committing them would have widened the scope silently.
