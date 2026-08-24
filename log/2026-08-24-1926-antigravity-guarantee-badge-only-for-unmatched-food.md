# Session Log: Show Guarantee Badge Only for Out-of-Catalogue Meals, Not Empty Plates

**Date:** 2026-08-24 19:26
**Agent:** antigravity
**Topic:** guarantee-badge-only-for-unmatched-food
**Issue:** #337

## Accomplished
1. **Conditional Guarantee Badge (`Abstention.tsx`):**
   - Wrapped the "Denetlenmiş Besin Güvencesi (D1)" card in `{!isEmptyPlate ? (...) : null}`.
   - When the plate is empty or non-food is photographed, the irrelevant TÜRKOMP laboratory guarantee card is hidden.
   - The badge is shown only when real food is recognized but is outside the verified catalogue.
2. **Automated Verification:** 297 Vitest tests, 289 Python parity tests, mobile typecheck, and status checks passing cleanly.

## Traps
- Always ensure screen notices are directly contextual to the user's situation (empty image vs out-of-catalogue food).
