/**
 * Server-side, item-scoped correction.
 *
 * The request contains a MealLog snapshot only as an observation of the
 * previous server response. Nutrients, grams, confidence, and totals from
 * that snapshot are never trusted: every resolved item is re-grounded against
 * the locale pack and recomputed through the existing portion and nutrition
 * functions before routing again.
 */
import { type MealLog } from '../domain/models';
export interface ItemCorrection {
    item_index: number;
    food_id?: string;
    quantity?: number | null;
    unit?: string | null;
    grams?: number;
}
export interface CorrectionRequest {
    meal: MealLog;
    corrections: ItemCorrection[];
}
export declare class CorrectionValidationError extends Error {
    constructor(message: string);
}
export declare function applyCorrections(request: CorrectionRequest): MealLog;
