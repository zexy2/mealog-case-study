/**
 * Pipeline data types. One rule runs through all of them: no stage that talks
 * to a model is allowed to produce a nutrient number. Models produce *references*
 * (a surface form, then a canonical food_id, then grams). Nutrients are computed.
 *
 * Ported 1:1 from `server/src/mealog/domain/models.py`. Field names keep the
 * Python snake_case spelling because these objects cross the API and fixture
 * boundary, where the wire shape is the contract and a rename is a breaking
 * change the parity gate would catch as a diff.
 *
 * This module is framework-agnostic by rule: no NestJS import may appear under
 * `src/domain/`, and `scripts/check_invariants.py` fails the build if one does.
 */
import { CuisineBucket } from './taxonomy';
export declare const ABSTAIN = "ABSTAIN";
export interface Nutrients {
    kcal: number;
    protein_g: number;
    carb_g: number;
    fat_g: number;
}
/** Pydantic field defaults for `Nutrients`: every macro defaults to 0.0. */
export declare function makeNutrients(init?: Partial<Nutrients>): Nutrients;
/** `Nutrients.__add__` */
export declare function addNutrients(a: Nutrients, b: Nutrients): Nutrients;
/** `Nutrients.rounded` */
export declare function roundedNutrients(n: Nutrients, nd?: number): Nutrients;
export interface CanonicalFood {
    food_id: string;
    name: string;
    per_100g: Nutrients;
    default_serving_g: number;
    default_serving_name: string;
    source: string;
    locale: string;
    packaged: boolean;
    serving_size_g: number | null;
    serving_size_name: string | null;
    serving_size_source: string | null;
    net_weight_g: number | null;
    net_weight_source: string | null;
    density_g_per_ml: number | null;
    density_source: string | null;
}
/**
 * `CanonicalFood.validate_food_provenance`.
 *
 * Every supplied mass must arrive with its source. D7 and the packaged-serving
 * work both depend on this: a guess must never be presented with the confidence
 * of a measurement, so a value without provenance is rejected rather than
 * silently trusted.
 *
 * Throws with the Python validator's message on the first violation.
 */
export declare function validateCanonicalFood(food: CanonicalFood): CanonicalFood;
/**
 * Raw output of the vision/text stage. Deliberately has no food_id and no
 * nutrients -- only what was *observed*.
 */
export interface PerceivedItem {
    surface_form: string;
    cooking_method: string | null;
    portion_hint: string | null;
    /** Provider count; null means count was not evidenced. */
    count: number | null;
    /** Where quantity evidence originated, never inferred from the food name. */
    count_origin: CountOrigin;
    /** Provider classification of the capture surface; non-real media is a red flag. */
    capture_medium: CaptureMedium;
    confidence: number;
    /**
     * Only populated by the V0 baseline, which asks the model for calories
     * directly. Kept so the ablation can quantify what grounding buys us.
     */
    ungrounded_kcal: number | null;
}
export type CountOrigin = 'vision' | 'user_text' | null;
export type CaptureMedium = 'real_plate' | 'screen' | 'printed' | 'toy_or_model' | 'unclear';
export declare function makePerceivedItem(init: Partial<PerceivedItem> & Pick<PerceivedItem, 'surface_form'>): PerceivedItem;
export interface NormalizedItem {
    original: PerceivedItem;
    /** locale-normalized retrieval key */
    query: string;
    quantity: number | null;
    unit: string | null;
    count_origin: CountOrigin;
}
export interface Candidate {
    food_id: string;
    name: string;
    score: number;
}
export type ClarificationKind = 'count' | 'identity' | 'portion';
export interface ItemClarification {
    kind: ClarificationKind;
    unit: string | null;
    options: Array<number | null>;
}
/** A perceived item bound to the canonical catalogue -- or explicitly not. */
export interface ResolvedItem {
    query: string;
    food_id: string;
    candidates: Candidate[];
    /** Normalized provider quantity evidence; null means the quantity is unknown. */
    quantity: number | null;
    unit: string | null;
    count_origin: CountOrigin;
    /** Perception media classification carried through to the response. */
    capture_medium: CaptureMedium;
    grams: number;
    grams_p10: number;
    grams_p90: number;
    confidence: number;
    nutrients: Nutrients;
    portion_source: string;
    portion_provenance: string;
    clarification: ItemClarification | null;
}
export declare function makeResolvedItem(init: Partial<ResolvedItem> & Pick<ResolvedItem, 'query'>): ResolvedItem;
/** `ResolvedItem.abstained` */
export declare function isAbstained(item: ResolvedItem): boolean;
export interface MealLog {
    idempotency_key: string;
    locale: string;
    cuisine: CuisineBucket | null;
    items: ResolvedItem[];
    totals: Nutrients;
    /** auto_accept | review | ask */
    action: string;
    question: string | null;
    config: string;
    /** True when the provider used a fallback or otherwise degraded rung. */
    degraded: boolean;
}
export declare function makeMealLog(init: Partial<MealLog> & Pick<MealLog, 'idempotency_key' | 'locale'>): MealLog;
