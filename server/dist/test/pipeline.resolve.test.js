"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const models_1 = require("../src/domain/models");
const resolve_1 = require("../src/pipeline/resolve");
function candidate(foodId, score) {
    return { food_id: foodId, name: foodId, score };
}
(0, vitest_1.describe)('closed-set resolver', () => {
    (0, vitest_1.it)('accepts a clear single candidate', () => {
        const result = (0, resolve_1.resolve)('rice', [candidate('us.rice_white_cooked', 0.8)]);
        (0, vitest_1.expect)(result.food_id).toBe('us.rice_white_cooked');
        (0, vitest_1.expect)(result.confidence).toBe(0.88);
        (0, vitest_1.expect)(result.candidates).toEqual([candidate('us.rice_white_cooked', 0.8)]);
    });
    (0, vitest_1.it)('uses the top-two margin to lower confidence for a near tie', () => {
        const result = (0, resolve_1.resolve)('rice', [
            candidate('us.rice_white_cooked', 0.8),
            candidate('jp.rice_steamed', 0.79),
        ]);
        (0, vitest_1.expect)(result.food_id).toBe('us.rice_white_cooked');
        (0, vitest_1.expect)(result.confidence).toBe(0.488);
    });
    (0, vitest_1.it)('abstains below the acceptance threshold instead of returning the top candidate', () => {
        const result = (0, resolve_1.resolve)('unicorn casserole', [candidate('us.rice_white_cooked', 0.33)]);
        (0, vitest_1.expect)(result.food_id).toBe(models_1.ABSTAIN);
        (0, vitest_1.expect)(result.confidence).toBe(0.462);
        (0, vitest_1.expect)(result.candidates[0]?.food_id).toBe('us.rice_white_cooked');
    });
    (0, vitest_1.it)('keeps the correct low-scoring candidate only when abstention is explicitly disabled', () => {
        const result = (0, resolve_1.resolve)('known but weak query', [candidate('us.rice_white_cooked', resolve_1.MIN_ACCEPT_SCORE - 0.01)], false);
        (0, vitest_1.expect)(result.food_id).toBe('us.rice_white_cooked');
    });
    (0, vitest_1.it)('preserves the independent confusion cap below the acceptance threshold', () => {
        const result = (0, resolve_1.resolve)('baked beans', [candidate('tr.kuru_fasulye', 0.30)]);
        (0, vitest_1.expect)(result.food_id).toBe(models_1.ABSTAIN);
    });
    (0, vitest_1.it)('returns ABSTAIN for an empty candidate set', () => {
        const result = (0, resolve_1.resolve)('nothing in the catalogue', []);
        (0, vitest_1.expect)(result.food_id).toBe(models_1.ABSTAIN);
        (0, vitest_1.expect)(result.confidence).toBe(0.0);
        (0, vitest_1.expect)(result.candidates).toEqual([]);
    });
    (0, vitest_1.it)('does not expose arbitrary strings as a resolved food ID', () => {
        const result = (0, resolve_1.resolve)('rice', [candidate('us.rice_white_cooked', 0.8)]);
        const closedSetId = result.food_id;
        (0, vitest_1.expect)(closedSetId).toBe('us.rice_white_cooked');
        // @ts-expect-error An ID not sourced from the candidate set is not representable.
        const invented = 'invented.food';
        (0, vitest_1.expect)(invented).toBe('invented.food');
    });
});
//# sourceMappingURL=pipeline.resolve.test.js.map