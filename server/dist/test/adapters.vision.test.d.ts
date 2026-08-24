/**
 * Vision adapters: fixture replay and the live Gemini provider.
 *
 * Two properties decide this module and get the most attention here:
 *
 *  1. **The fixture adapter keys on the SHA-256 of the image bytes.** Not the
 *     filename, not `sample_id`. The sharpest form of that test is the
 *     negative one: when bytes are present and no fixture matches their hash,
 *     replay must fail even though a `sample_id` fixture is sitting right
 *     there. A fallback would let a mislabelled image replay someone else's
 *     recording and still look green.
 *
 *  2. **A provider response carrying a nutrition field is rejected**, not
 *     accepted with the field ignored. D1 says the vision stage never produces
 *     a nutrient number; if it starts, that has to surface as a failure.
 *
 * Everything runs offline. The Gemini adapter is driven through a stubbed
 * transport and is never called live; no test contains or needs a key.
 */
export {};
