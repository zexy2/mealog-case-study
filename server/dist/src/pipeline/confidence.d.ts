/**
 * Confidence routing: what the product does when it is unsure.
 *
 * This is a framework-free port of `server/src/mealog/pipeline/confidence.py`.
 * It routes on the weakest item signal, so one uncertain item gates the meal
 * rather than being hidden by an average. Identity confidence and portion
 * confidence remain separate signals: the former is returned by perception /
 * retrieval, while the latter is derived from the deterministic mass band.
 */
import { type MealLog } from '../domain/models';
export declare const AUTO_ACCEPT = 0.75;
export declare const ASK_BELOW = 0.4;
export declare const VISION_COUNT_CONFIDENCE = 0.6;
/**
 * Map relative p10-p90 width to a bounded confidence signal.
 *
 * A zero-width band scores 1.0. A band as wide as its midpoint scores 0.0.
 * Missing or malformed intervals fail closed instead of allowing an
 * identity-only auto-accept. This is deliberately a separate value: the API's
 * `confidence` field continues to mean identity confidence.
 */
export declare function portionConfidence(item: MealLog['items'][number]): number;
/** A visual count is evidence, but weaker than a count supplied by the user. */
export declare function countConfidence(item: MealLog['items'][number]): number;
/** Use the weaker of identity confidence and portion confidence for routing. */
export declare function effectiveConfidence(item: MealLog['items'][number]): number;
/** Any non-real_plate value is a safety red flag, never positive evidence. */
export declare function captureMediumQuestion(item: MealLog['items'][number]): string | null;
/** Route a meal log in place, preserving identity confidence and question text. */
export declare function route(log: MealLog): MealLog;
