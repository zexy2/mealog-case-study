# Session Log: Fix DEFAULT_LOCALE Fallback, Add WebP/GIF Metadata Stripping, and Sync Documentation

**Date:** 2026-08-24 15:25
**Agent:** antigravity
**Topic:** fix-default-locale-and-sync-docs
**Issue:** #291

## Accomplished
1. **DEFAULT_LOCALE Controller Integration:** Fixed `MealsController.create` and `parseFields` to use `this.runtimeSettings.default_locale` instead of hardcoded `'en_US'` when the request does not specify an explicit `locale`.
2. **WebP and GIF Metadata Stripping:** Implemented pure-TypeScript binary sanitizers `stripMetadataWebp` (removing `EXIF` and `XMP ` RIFF chunks) and `stripMetadataGif` (removing Comment and XMP Application extensions) in `server/src/pipeline/privacy.ts`.
3. **Security Architecture Alignment:** Updated `docs/security.md` to reflect JPEG/PNG/WebP/GIF metadata stripping and accurately state that pixel-level face blurring is a decoupled pure-TS module per D14.
4. **Documentation Synchronization:** Updated `CASE-STUDY-GAP-REPORT.md` (Node 22, 296 Vitest tests, 289 Python parity tests), `docs/comparison.md` (updated A2 row to reflect `quantity: null` and explicit uncertainty intervals), and `README.md` (synchronized cuisine scorecard table with `docs/evaluation.md`).
5. **Quality Gates Green:** 296 Vitest tests passing across 24 files, 289 Python parity tests passing, 0 lint errors, 0 secret findings, and 0 invariant violations.

## Traps
- Never hardcode `'en_US'` in controller parsers when the server runtime is configured with a dynamic `DEFAULT_LOCALE` environment variable.
