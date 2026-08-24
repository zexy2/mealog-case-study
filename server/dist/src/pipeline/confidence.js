"use strict";
/**
 * Confidence routing: what the product does when it is unsure.
 *
 * This is a framework-free port of `server/src/mealog/pipeline/confidence.py`.
 * It routes on the weakest item signal, so one uncertain item gates the meal
 * rather than being hidden by an average. Identity confidence and portion
 * confidence remain separate signals: the former is returned by perception /
 * retrieval, while the latter is derived from the deterministic mass band.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VISION_COUNT_CONFIDENCE = exports.ASK_BELOW = exports.AUTO_ACCEPT = void 0;
exports.portionConfidence = portionConfidence;
exports.countConfidence = countConfidence;
exports.effectiveConfidence = effectiveConfidence;
exports.captureMediumQuestion = captureMediumQuestion;
exports.route = route;
const models_1 = require("../domain/models");
exports.AUTO_ACCEPT = 0.75;
exports.ASK_BELOW = 0.40;
exports.VISION_COUNT_CONFIDENCE = 0.60;
/**
 * Map relative p10-p90 width to a bounded confidence signal.
 *
 * A zero-width band scores 1.0. A band as wide as its midpoint scores 0.0.
 * Missing or malformed intervals fail closed instead of allowing an
 * identity-only auto-accept. This is deliberately a separate value: the API's
 * `confidence` field continues to mean identity confidence.
 */
function portionConfidence(item) {
    const values = [item.grams, item.grams_p10, item.grams_p90];
    if (!values.every(Number.isFinite)
        || !(item.grams_p10 > 0 && item.grams_p10 <= item.grams && item.grams <= item.grams_p90)) {
        return 0.0;
    }
    const relativeWidth = (item.grams_p90 - item.grams_p10) / item.grams;
    return Math.round(Math.max(0.0, Math.min(1.0, 1.0 - relativeWidth)) * 1000) / 1000;
}
/** A visual count is evidence, but weaker than a count supplied by the user. */
function countConfidence(item) {
    return item.count_origin === 'vision' && item.quantity !== null
        ? exports.VISION_COUNT_CONFIDENCE
        : 1.0;
}
/** Use the weaker of identity confidence and portion confidence for routing. */
function effectiveConfidence(item) {
    return Math.round(Math.min(item.confidence, portionConfidence(item), countConfidence(item)) * 1000) / 1000;
}
const CAPTURE_MEDIUM_QUESTIONS = {
    screen: 'This image appears to show food on a screen. Please upload a direct photo of the real meal.',
    printed: 'This image appears to be printed food imagery. Please upload a direct photo of the real meal.',
    toy_or_model: 'This image may show a toy or model rather than real food. Please upload a direct photo of the real meal.',
    unclear: 'I could not confirm this is a direct photo of a real meal. Please upload a clearer meal photo.',
};
/** Any non-real_plate value is a safety red flag, never positive evidence. */
function captureMediumQuestion(item) {
    return item.capture_medium === 'real_plate'
        ? null
        : CAPTURE_MEDIUM_QUESTIONS[item.capture_medium] ?? CAPTURE_MEDIUM_QUESTIONS.unclear;
}
/** Route a meal log in place, preserving identity confidence and question text. */
function route(log) {
    if (log.degraded) {
        log.action = 'review';
        return log;
    }
    if (log.items.length === 0) {
        log.action = 'ask';
        log.question = 'I could not read this meal. What did you eat?';
        return log;
    }
    const mediumFlag = log.items.find((item) => item.capture_medium !== 'real_plate');
    if (mediumFlag !== undefined) {
        log.action = 'ask';
        log.question = captureMediumQuestion(mediumFlag);
        return log;
    }
    const unknown = log.items.find(models_1.isAbstained);
    if (unknown !== undefined) {
        log.action = 'ask';
        log.question = `I could not match '${unknown.query}'. Which of these is closest?`;
        return log;
    }
    // A point mass without quantity evidence can silently turn several visible
    // instances into one catalogue serving. Keep the count unknown and make the
    // user review it; this is additive to the interval gate and does not invent
    // a count or tune either existing threshold.
    if (log.items.some((item) => item.quantity === null)) {
        log.action = 'review';
        return log;
    }
    const lowest = Math.min(...log.items.map(effectiveConfidence));
    if (lowest >= exports.AUTO_ACCEPT) {
        log.action = 'auto_accept';
    }
    else if (lowest < exports.ASK_BELOW) {
        const item = log.items.reduce((current, candidate) => candidate.confidence < current.confidence ? candidate : current);
        log.action = 'ask';
        log.question = `Is '${item.query}' ${item.candidates[0]?.name ?? 'correct'}?`;
    }
    else {
        log.action = 'review';
    }
    return log;
}
//# sourceMappingURL=confidence.js.map