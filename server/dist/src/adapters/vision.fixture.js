"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FixtureVision = exports.FIXTURE_DIR = void 0;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const ports_1 = require("../pipeline/ports");
const vision_gemini_1 = require("./vision.gemini");
/**
 * Locate `eval/fixtures` by walking up from this module.
 *
 * Python resolves it as `parents[4] / "eval" / "fixtures"` from the source
 * file. A fixed number of levels is not portable here, because the module runs
 * from `src/` under the test runner and from `dist/src/` after a build. Walking
 * up for the directory itself gives the same answer from both.
 */
function findFixtureDir(start = __dirname) {
    let current = (0, node_path_1.resolve)(start);
    for (let depth = 0; depth < 10; depth += 1) {
        const candidate = (0, node_path_1.join)(current, 'eval', 'fixtures');
        if ((0, node_fs_1.existsSync)(candidate)) {
            return candidate;
        }
        const parent = (0, node_path_1.dirname)(current);
        if (parent === current) {
            break;
        }
        current = parent;
    }
    // Fall back to the Python layout so the error names a real path.
    return (0, node_path_1.resolve)(start, '..', '..', '..', '..', 'eval', 'fixtures');
}
exports.FIXTURE_DIR = findFixtureDir();
class FixtureVision {
    name = 'fixture';
    dir;
    constructor(directory) {
        this.dir = directory ?? exports.FIXTURE_DIR;
    }
    /**
     * Resolve the fixture key for an input.
     *
     * Exported behaviour, not an implementation detail: when image bytes are
     * present the content hash is used and `sample_id` is ignored entirely, even
     * if a fixture for that `sample_id` exists. Falling back would let a
     * mislabelled image replay someone else's recording and still look green.
     */
    fixtureKeyFor(input) {
        return input.imageBytes !== null ? input.contentHash : input.sampleId;
    }
    perceive(input) {
        // String input remains a test-only convenience for existing offline
        // callers. Image inputs always use their content hash, never their ID.
        const resolved = typeof input === 'string' ? new ports_1.VisionInput({ sampleId: input }) : input;
        const key = this.fixtureKeyFor(resolved);
        if (!key) {
            throw new Error('fixture replay needs image bytes or a sample_id');
        }
        const path = (0, node_path_1.join)(this.dir, `${key}.json`);
        if (!(0, node_fs_1.existsSync)(path)) {
            throw new Error(`no recorded response for '${key}'. ` +
                'Record one with `make eval-live` before adding it to the golden set.');
        }
        const raw = JSON.parse((0, node_fs_1.readFileSync)(path, 'utf-8'));
        // A fixture is a recorded provider response, so it goes through the same
        // D1 validation a live response does. All 80 committed fixtures pass
        // unchanged; the difference is that a tampered one is rejected rather than
        // silently stripped of its nutrition field.
        // Backward compatibility for p3 and older fixtures: an omitted medium is
        // explicitly replayed as neutral real_plate. Live responses still require
        // the field; this default exists only at the recorded-fixture boundary.
        const items = Array.isArray(raw.items)
            ? raw.items.map((item) => {
                if (typeof item !== 'object' || item === null || Array.isArray(item))
                    return item;
                const record = item;
                return 'medium' in record ? item : { ...record, medium: 'real_plate' };
            })
            : raw.items;
        return {
            observations: (0, vision_gemini_1.parseObservationItems)(items, `fixture '${key}'`, raw.input_kind === 'user_text' ? 'user_text' : 'vision'),
            degraded: raw.degraded ?? false,
        };
    }
}
exports.FixtureVision = FixtureVision;
//# sourceMappingURL=vision.fixture.js.map