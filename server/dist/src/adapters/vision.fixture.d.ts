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
import { VisionInput, type VisionResult } from '../pipeline/ports';
export declare const FIXTURE_DIR: string;
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
export declare class FixtureVision {
    readonly name = "fixture";
    readonly dir: string;
    constructor(directory?: string);
    /**
     * Resolve the fixture key for an input.
     *
     * Exported behaviour, not an implementation detail: when image bytes are
     * present the content hash is used and `sample_id` is ignored entirely, even
     * if a fixture for that `sample_id` exists. Falling back would let a
     * mislabelled image replay someone else's recording and still look green.
     */
    fixtureKeyFor(input: VisionInput): string | null;
    perceive(input: VisionInput | string): VisionResult;
}
