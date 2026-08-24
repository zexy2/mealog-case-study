# Session Log: Clarify Privacy Pipeline Boundary (D14)

**Date:** 2026-08-24 14:53
**Agent:** antigravity
**Topic:** clarify-face-blur-boundary
**Issue:** #283

## Accomplished
1. **Decision D14 Appended:** Clarified the boundary between live edge HTTP sanitization (`sanitizeImageBuffer()` for deterministic binary EXIF/GPS/metadata stripping) and pure-JS pixel-level face blurring (`blurFacesInPixelArray` for raw RGBA arrays).
2. **Interview Answers Alignment:** Updated question 4 in `docs/interview_questions_answers.md` to describe the two-tier privacy architecture without overclaiming that the edge HTTP container performs on-the-fly JPEG decoding/re-encoding.
3. **README Decision Index:** Updated references across `README.md` to point to D1–D14.

## Traps
- `docs/decisions.md` is strictly append-only; never edit previous decisions in place—always append a superseding decision.
