/**
 * Deterministic nutrition computation.
 *
 * This is the only stage allowed to produce nutrient numbers. It is a pure,
 * framework-free port of `server/src/mealog/pipeline/nutrition.py`: model and
 * adapter code can provide references, but calories and macros come only from
 * the canonical catalogue.
 */
import { type CanonicalFood, type Nutrients } from '../domain/models';
/** Scale a catalogue's per-100g nutrients by a non-negative mass. */
export declare function scalePer100g(per_100g: Nutrients, grams: number): Nutrients;
/** Sum nutrients over `(food, grams)` pairs in input order. */
export declare function total(pairs: readonly (readonly [CanonicalFood, number])[]): Nutrients;
