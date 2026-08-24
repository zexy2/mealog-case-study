/**
 * Evidence-graded mass estimation.
 *
 * The returned value is a distribution, not a point estimate: `grams` is the
 * deterministic midpoint used by nutrition, while `p10` and `p90` carry the
 * uncertainty that the confidence stage must see. This module is pure and
 * framework-free so the API and the offline evaluator can share it.
 *
 * Ported from `server/src/mealog/pipeline/portion.py`. Field names remain
 * snake_case because they cross the API and fixture boundary.
 */
import type { CanonicalFood, CountOrigin } from '../domain/models';
/** Catalogue-default evidence band. */
export declare const DEFAULT_SPREAD: readonly [0.65, 1.45];
/** Stated quantity plus a known unit: stronger, but not weighed, evidence. */
export declare const EXPLICIT_UNIT_SPREAD: readonly [0.8, 1.25];
/** Missing quantity still gets the unit centre, not explicit-unit confidence. */
export declare const ASSUMED_QUANTITY_SPREAD: readonly [0.65, 1.45];
/** Unknown density must be visible to confidence routing. */
export declare const UNKNOWN_DENSITY_SPREAD: readonly [0.45, 1.75];
export declare const UNKNOWN_DENSITY_MIDPOINT_G_PER_ML = 1;
/** Printed serving/net weight is strong mass evidence, not a weighed meal. */
export declare const LABEL_SERVING_SPREAD: readonly [0.9, 1.1];
/** Quantity-only fallback keeps a little more uncertainty than a unit. */
export declare const CATALOGUE_DEFAULT_SCALED_SPREAD: readonly [0.75, 1.35];
export interface UnitConversion {
    g?: number;
    ml?: number;
}
/** Minimal structural contract; the locale loader owns the concrete pack. */
export interface PortionLocalePack {
    units: ReadonlyMap<string, UnitConversion> | Readonly<Record<string, UnitConversion>>;
}
export type PortionQuantity = number | null | undefined;
export type PortionUnit = string | null | undefined;
export type PortionSource = 'catalogue_default' | 'catalogue_default_scaled' | 'vision_count' | 'explicit_unit' | 'assumed_unit' | 'known_density' | 'assumed_density' | 'unknown_density' | 'label_serving' | 'net_weight' | 'packaged_fallback';
export interface PortionEstimate {
    grams: number;
    p10: number;
    p90: number;
    source: PortionSource;
    provenance: string;
}
/**
 * Estimate food mass from product evidence, a unit conversion, or the
 * catalogue default. Volume is never treated as grams: a food density is
 * required for a narrow result, otherwise UNKNOWN_DENSITY_SPREAD is returned.
 */
export declare function estimate(food: CanonicalFood, quantity: PortionQuantity, unit: PortionUnit, pack: PortionLocalePack, correctionGrams?: number, countOrigin?: CountOrigin): PortionEstimate;
/** Parse common English/Turkish quantity words and numeric fractions. */
export declare function parsePortion(hint: string | null | undefined): [number | null, string | null];
