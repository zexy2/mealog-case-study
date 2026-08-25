# Session log — public MEXT provenance boundary

Agent: codex3
Issue: #385

State: Corrected the public wording for the Japanese locale pack without
changing any nutrient value or runtime behavior.

Done: Row-level comparison found only 2 of 8 rows exactly matched the four
checked nutrient fields in MEXT 2015; the remaining rows did not exactly match
the checked 2015, 2020, or 2023 tables. The notice and pack metadata now call
the data an unverified legacy pack rather than verified MEXT data.

Next: Merge this documentation-only correction before creating a clean-history
public submission mirror.

Traps: `license: unverified` is not enough if surrounding prose still calls the
whole pack MEXT data. Do not infer provenance from approximate numeric matches.
