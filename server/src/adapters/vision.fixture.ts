/**
 * Replay adapter.
 *
 * Recorded provider responses live in `eval/fixtures/`. This is what lets
 * `make eval` reproduce the published scorecard with no API key, no network and
 * no spend — which removes the single most common take-home failure (reviewer
 * cannot run it) and makes the numbers in the README independently verifiable.
 *
 * Ported from `server/src/mealog/adapters/vision_fixture.py`.
 *
 * The lookup key is the whole point of this module. **An image input is keyed
 * by the SHA-256 of its bytes, never by `sample_id`**, which is what makes the
 * same photograph resolve to the same recorded response on any machine, and
 * what stops a renamed or mislabelled sample from quietly replaying the wrong
 * response. `sample_id` remains only as the fixture-provider compatibility path
 * D5 describes, for inputs that carry no bytes at all.
 *
 * This module is framework-agnostic by rule: no framework import may appear
 * under `src/adapters/`, and `scripts/check_invariants.py` fails the build if
 * one does.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { VisionInput, type VisionResult } from '../pipeline/ports';
import { parseObservationItems } from './vision.gemini';

/**
 * Locate `eval/fixtures` by walking up from this module.
 *
 * Python resolves it as `parents[4] / "eval" / "fixtures"` from the source
 * file. A fixed number of levels is not portable here, because the module runs
 * from `src/` under the test runner and from `dist/src/` after a build. Walking
 * up for the directory itself gives the same answer from both.
 */
function findFixtureDir(start: string = __dirname): string {
  let current = resolve(start);
  for (let depth = 0; depth < 10; depth += 1) {
    const candidate = join(current, 'eval', 'fixtures');
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  // Fall back to the Python layout so the error names a real path.
  return resolve(start, '..', '..', '..', '..', 'eval', 'fixtures');
}

export const FIXTURE_DIR = findFixtureDir();

export interface FixtureFile {
  readonly _synthetic?: boolean;
  readonly sample_id?: string | null;
  readonly input_sha256?: string | null;
  readonly provider?: string;
  readonly model_id?: string;
  readonly prompt_version?: string;
  readonly input_kind?: 'vision' | 'user_text';
  readonly degraded?: boolean;
  readonly items: unknown;
}

export class FixtureVision {
  readonly name = 'fixture';

  readonly dir: string;

  constructor(directory?: string) {
    this.dir = directory ?? FIXTURE_DIR;
  }

  /**
   * Resolve the fixture key for an input.
   *
   * Exported behaviour, not an implementation detail: when image bytes are
   * present the content hash is used and `sample_id` is ignored entirely, even
   * if a fixture for that `sample_id` exists. Falling back would let a
   * mislabelled image replay someone else's recording and still look green.
   */
  fixtureKeyFor(input: VisionInput): string | null {
    return input.imageBytes !== null ? input.contentHash : input.sampleId;
  }

  perceive(input: VisionInput | string): VisionResult {
    // String input remains a test-only convenience for existing offline
    // callers. Image inputs always use their content hash, never their ID.
    const resolved = typeof input === 'string' ? new VisionInput({ sampleId: input }) : input;

    const key = this.fixtureKeyFor(resolved);
    if (!key) {
      throw new Error('fixture replay needs image bytes or a sample_id');
    }

    const path = join(this.dir, `${key}.json`);
    if (!existsSync(path)) {
      throw new Error(
        `no recorded response for '${key}'. ` +
          'Record one with `make eval-live` before adding it to the golden set.',
      );
    }

    const raw = JSON.parse(readFileSync(path, 'utf-8')) as FixtureFile;
    // A fixture is a recorded provider response, so it goes through the same
    // D1 validation a live response does. All 80 committed fixtures pass
    // unchanged; the difference is that a tampered one is rejected rather than
    // silently stripped of its nutrition field.
    // Backward compatibility for p3 and older fixtures: an omitted medium is
    // explicitly replayed as neutral real_plate. Live responses still require
    // the field; this default exists only at the recorded-fixture boundary.
    const items: unknown = Array.isArray(raw.items)
      ? (raw.items as unknown[]).map((item: unknown): unknown => {
        if (typeof item !== 'object' || item === null || Array.isArray(item)) return item;
        const record = item as Record<string, unknown>;
        return 'medium' in record ? item : { ...record, medium: 'real_plate' };
      })
      : raw.items;
    return {
      observations: parseObservationItems(
        items,
        `fixture '${key}'`,
        raw.input_kind === 'user_text' ? 'user_text' : 'vision',
      ),
      degraded: raw.degraded ?? false,
    };
  }
}
