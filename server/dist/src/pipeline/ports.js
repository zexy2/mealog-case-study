"use strict";
/**
 * Boundaries between input transport, vision providers and the pipeline.
 *
 * Ported from `server/src/mealog/pipeline/ports.py`.
 *
 * This module is framework-agnostic by rule: no NestJS import may appear under
 * `src/pipeline/`, and `scripts/check_invariants.py` fails the build if one
 * does. That is what lets the eval harness import the pipeline without booting
 * Nest.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisionInput = void 0;
const node_crypto_1 = require("node:crypto");
/**
 * One perception input.
 *
 * `sampleId` is a fixture-only compatibility path. Real providers must
 * receive image bytes or explicit text; image fixture keys use
 * `contentHash` so an ID cannot accidentally stand in for a photograph.
 */
class VisionInput {
    imageBytes;
    imageMediaType;
    text;
    sampleId;
    constructor(init = {}) {
        this.imageBytes = init.imageBytes ?? null;
        this.imageMediaType = init.imageMediaType ?? null;
        this.text = init.text ?? null;
        this.sampleId = init.sampleId ?? null;
        // Mirrors VisionInput.__post_init__.
        if (this.imageBytes !== null && !(this.imageBytes instanceof Uint8Array)) {
            throw new TypeError('image_bytes must be bytes');
        }
        if (this.imageBytes !== null && !this.imageMediaType) {
            throw new Error('image_media_type is required with image_bytes');
        }
        const hasText = this.text !== null && this.text.trim() !== '';
        if (!this.imageBytes && !hasText && !this.sampleId) {
            throw new Error('VisionInput needs image bytes, text, or sample_id');
        }
        Object.freeze(this);
    }
    get contentHash() {
        if (this.imageBytes === null) {
            return null;
        }
        return (0, node_crypto_1.createHash)('sha256').update(this.imageBytes).digest('hex');
    }
    get fixtureKey() {
        return this.contentHash ?? this.sampleId;
    }
    get logReference() {
        return this.fixtureKey ?? 'text-input';
    }
}
exports.VisionInput = VisionInput;
//# sourceMappingURL=ports.js.map