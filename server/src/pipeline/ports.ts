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

import { createHash } from 'node:crypto';

import type { PerceivedItem } from '../domain/models';

export interface VisionInputInit {
  imageBytes?: Uint8Array | null;
  imageMediaType?: string | null;
  text?: string | null;
  sampleId?: string | null;
}

/**
 * One perception input.
 *
 * `sampleId` is a fixture-only compatibility path. Real providers must
 * receive image bytes or explicit text; image fixture keys use
 * `contentHash` so an ID cannot accidentally stand in for a photograph.
 */
export class VisionInput {
  readonly imageBytes: Uint8Array | null;
  readonly imageMediaType: string | null;
  readonly text: string | null;
  readonly sampleId: string | null;

  constructor(init: VisionInputInit = {}) {
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

  get contentHash(): string | null {
    if (this.imageBytes === null) {
      return null;
    }
    return createHash('sha256').update(this.imageBytes).digest('hex');
  }

  get fixtureKey(): string | null {
    return this.contentHash ?? this.sampleId;
  }

  get logReference(): string {
    return this.fixtureKey ?? 'text-input';
  }
}

/**
 * A vision response carries no nutrition fields.
 *
 * D1 makes this architectural rather than a prompt instruction: the provider
 * stage returns observed items only, and nutrition is computed downstream by a
 * pure function over the canonical catalogue. `PerceivedItem` therefore has no
 * `nutrients`, no `per_100g` and no `food_id`.
 *
 * The single exception is `ungrounded_kcal`, which exists only so the V0
 * baseline -- the rejected "ask the model for calories" alternative -- can be
 * measured rather than asserted. It is not a nutrition field on the grounded
 * path: no config above V0 reads it.
 */
export type VisionObservation = PerceivedItem;

/**
 * One request's provider result. `degraded` belongs to this response, not to
 * adapter instance state, so concurrent requests cannot inherit one another's
 * fallback status.
 */
export interface VisionResult {
  readonly observations: VisionObservation[];
  readonly degraded: boolean;
}

/** Turns image/text input into observed items and provider status. */
export interface VisionPort {
  readonly name: string;

  perceive(input: VisionInput): VisionResult | Promise<VisionResult>;
}
