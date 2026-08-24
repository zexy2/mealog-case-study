"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const models_1 = require("../src/domain/models");
const confidence_1 = require("../src/pipeline/confidence");
const candidate = (name) => ({
    food_id: `test.${name}`,
    name,
    score: 1,
});
const meal = (...items) => (0, models_1.makeMealLog)({ idempotency_key: 'test-key', locale: 'en_US', items });
const item = (query, confidence, name = 'matched food') => (0, models_1.makeResolvedItem)({
    query,
    food_id: `test.${query}`,
    confidence,
    candidates: [candidate(name)],
    grams: 100,
    grams_p10: 90,
    grams_p90: 110,
    quantity: 1,
    unit: 'serving',
});
(0, vitest_1.describe)('confidence routing', () => {
    (0, vitest_1.it)('auto-accepts when every item meets the boundary', () => {
        const log = (0, confidence_1.route)(meal(item('eggs', confidence_1.AUTO_ACCEPT), item('rice', 0.99)));
        (0, vitest_1.expect)(log.action).toBe('auto_accept');
        (0, vitest_1.expect)(log.question).toBeNull();
    });
    (0, vitest_1.it)('asks about a flagged medium even when identity, retrieval and portion are perfect', () => {
        const resolved = item('simit', 1);
        resolved.capture_medium = 'screen';
        resolved.candidates[0].score = 1;
        const log = (0, confidence_1.route)(meal(resolved));
        (0, vitest_1.expect)(log.action).toBe('ask');
        (0, vitest_1.expect)(log.question).toMatch(/screen/i);
    });
    (0, vitest_1.it)('treats real_plate as neutral so the existing confidence gate is unchanged', () => {
        const resolved = item('simit', confidence_1.AUTO_ACCEPT);
        resolved.capture_medium = 'real_plate';
        (0, vitest_1.expect)((0, confidence_1.route)(meal(resolved)).action).toBe('auto_accept');
    });
    (0, vitest_1.it)('never auto-accepts a degraded meal, even when every item is confident', () => {
        const log = meal(item('eggs', 0.99));
        log.degraded = true;
        (0, vitest_1.expect)((0, confidence_1.route)(log).action).toBe('review');
    });
    (0, vitest_1.it)('uses the weakest item to gate a meal into review', () => {
        const log = (0, confidence_1.route)(meal(item('eggs', 0.99), item('rice', confidence_1.AUTO_ACCEPT - 0.01)));
        (0, vitest_1.expect)(log.action).toBe('review');
        (0, vitest_1.expect)(log.question).toBeNull();
    });
    (0, vitest_1.it)('asks about the weakest item below the ask boundary', () => {
        const log = (0, confidence_1.route)(meal(item('eggs', 0.99), item('rice', confidence_1.ASK_BELOW - 0.01, 'white rice')));
        (0, vitest_1.expect)(log.action).toBe('ask');
        (0, vitest_1.expect)(log.question).toBe("Is 'rice' white rice?");
    });
    (0, vitest_1.it)('keeps both routing boundaries exact', () => {
        (0, vitest_1.expect)((0, confidence_1.route)(meal(item('auto', confidence_1.AUTO_ACCEPT))).action).toBe('auto_accept');
        (0, vitest_1.expect)((0, confidence_1.route)(meal(item('review', confidence_1.ASK_BELOW))).action).toBe('review');
    });
    (0, vitest_1.it)('asks when any item abstains, even if other items are confident', () => {
        const log = (0, confidence_1.route)(meal(item('eggs', 0.99), (0, models_1.makeResolvedItem)({ query: 'unknown', food_id: models_1.ABSTAIN, confidence: 0.99 })));
        (0, vitest_1.expect)(log.action).toBe('ask');
        (0, vitest_1.expect)(log.question).toBe("I could not match 'unknown'. Which of these is closest?");
    });
    (0, vitest_1.it)('asks for an empty meal', () => {
        const log = (0, confidence_1.route)(meal());
        (0, vitest_1.expect)(log.action).toBe('ask');
        (0, vitest_1.expect)(log.question).toBe('I could not read this meal. What did you eat?');
    });
    (0, vitest_1.it)('keeps identity confidence separate from portion confidence', () => {
        const resolved = item('ayran', 1);
        resolved.grams = 200;
        resolved.grams_p10 = 150;
        resolved.grams_p90 = 270;
        const log = (0, confidence_1.route)(meal(resolved));
        (0, vitest_1.expect)((0, confidence_1.portionConfidence)(resolved)).toBe(0.4);
        (0, vitest_1.expect)((0, confidence_1.effectiveConfidence)(resolved)).toBe(0.4);
        (0, vitest_1.expect)(resolved.confidence).toBe(1);
        (0, vitest_1.expect)(log.action).toBe('review');
    });
    (0, vitest_1.it)('weights a vision count below a user-entered count', () => {
        const visual = item('simit', 1);
        visual.count_origin = 'vision';
        const typed = item('simit', 1);
        typed.count_origin = 'user_text';
        (0, vitest_1.expect)((0, confidence_1.countConfidence)(visual)).toBeLessThan((0, confidence_1.countConfidence)(typed));
        (0, vitest_1.expect)((0, confidence_1.effectiveConfidence)(visual)).toBeLessThan((0, confidence_1.effectiveConfidence)(typed));
    });
    (0, vitest_1.it)('asks instead of auto-accepting a wide portion band', () => {
        const resolved = item('rice', 0.99);
        resolved.grams = 100;
        resolved.grams_p10 = 45;
        resolved.grams_p90 = 175;
        const log = (0, confidence_1.route)(meal(resolved));
        (0, vitest_1.expect)((0, confidence_1.portionConfidence)(resolved)).toBe(0);
        (0, vitest_1.expect)(log.action).toBe('ask');
        (0, vitest_1.expect)(resolved.confidence).toBe(0.99);
    });
    (0, vitest_1.it)('fails closed when the portion interval is missing', () => {
        const resolved = item('rice', 0.99);
        resolved.grams = 0;
        resolved.grams_p10 = 0;
        resolved.grams_p90 = 0;
        const log = (0, confidence_1.route)(meal(resolved));
        (0, vitest_1.expect)((0, confidence_1.portionConfidence)(resolved)).toBe(0);
        (0, vitest_1.expect)(log.action).toBe('ask');
    });
    (0, vitest_1.it)('routes an unknown quantity to review without inventing a count', () => {
        const resolved = (0, models_1.makeResolvedItem)({
            query: 'simit',
            food_id: 'tr.simit',
            candidates: [candidate('simit')],
            confidence: 1,
            grams: 100,
            grams_p10: 65,
            grams_p90: 145,
        });
        const log = (0, confidence_1.route)(meal(resolved));
        (0, vitest_1.expect)(resolved.quantity).toBeNull();
        (0, vitest_1.expect)(resolved.unit).toBeNull();
        (0, vitest_1.expect)(log.action).toBe('review');
    });
});
//# sourceMappingURL=pipeline.confidence.test.js.map