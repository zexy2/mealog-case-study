# Session Log: Reject Truncated and Corrupt Images with 415 Unsupported Media Type

**Date:** 2026-08-24 15:11
**Agent:** antigravity
**Topic:** reject-truncated-images-415
**Issue:** #289

## Accomplished
1. **Strict Image Length & Magic Byte Integrity:** Updated `isSupportedImageBytes` in `server/src/adapters/vision.gemini.ts` to require minimum valid byte lengths across media types (e.g. >= 4 bytes for JPEG, >= 8 bytes for PNG, >= 6 bytes for GIF, >= 12 bytes for WebP/AVIF/HEIC).
2. **Deterministic 415 at the Edge:** Truncated byte streams (such as a 3-byte JPEG `[0xff, 0xd8, 0xff]`) are now rejected immediately at the `MealsController` boundary with `415 Unsupported Media Type` rather than leaking through to fixture matching or live Gemini provider calls.
3. **E2E Test Added:** Added regression test in `server/test/meals.e2e.test.ts` verifying that truncated 3-byte JPEGs return HTTP 415.

## Traps
- Content signatures must check both the magic prefix and minimum header length so truncated byte buffers do not bypass media validation.
