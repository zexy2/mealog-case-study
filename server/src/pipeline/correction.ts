/**
 * Server-side, item-scoped correction.
 *
 * The request contains a MealLog snapshot only as an observation of the
 * previous server response. Nutrients, grams, confidence, and totals from
 * that snapshot are never trusted: every resolved item is re-grounded against
 * the locale pack and recomputed through the existing portion and nutrition
 * functions before routing again.
 */

import {
  ABSTAIN,
  addNutrients,
  makeMealLog,
  makeNutrients,
  makeResolvedItem,
  roundedNutrients,
  type MealLog,
} from '../domain/models';
import { load } from '../locales/loader';
import { addClarifications } from './clarification';
import { route } from './confidence';
import { scalePer100g } from './nutrition';
import { estimate } from './portion';
import { CONFIGS } from './runner';

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

export class CorrectionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CorrectionValidationError';
  }
}

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function validateNumber(value: number | null | undefined, field: string): void {
  if (value !== null && value !== undefined && (!Number.isFinite(value) || value < 0)) {
    throw new CorrectionValidationError(`${field} must be null or a non-negative number`);
  }
}

function appendProvenance(base: string, correction: ItemCorrection | undefined): string {
  if (!correction) return base;
  const fields: string[] = [];
  if (hasOwn(correction, 'food_id')) fields.push('food_id=user_confirmed');
  if (hasOwn(correction, 'quantity')) fields.push('quantity=user_confirmed');
  if (hasOwn(correction, 'unit')) fields.push('unit=user_confirmed');
  if (hasOwn(correction, 'grams')) fields.push('grams=user_confirmed');
  return fields.length > 0 ? `${base}; correction=${fields.join(',')}` : base;
}

function validateBase(meal: MealLog): void {
  if (!meal || typeof meal.locale !== 'string' || typeof meal.config !== 'string' || !Array.isArray(meal.items)) {
    throw new CorrectionValidationError('meal must contain locale, config, and items');
  }
}

function validateCandidateIds(meal: MealLog, foods: Record<string, unknown>): void {
  for (const item of meal.items) {
    if (item.food_id !== ABSTAIN && !foods[item.food_id]) {
      throw new CorrectionValidationError(`unknown food_id '${item.food_id}'`);
    }
    for (const candidate of item.candidates) {
      if (!foods[candidate.food_id]) {
        throw new CorrectionValidationError(`unknown candidate food_id '${candidate.food_id}'`);
      }
    }
  }
}

function validateCorrections(
  meal: MealLog,
  corrections: readonly ItemCorrection[],
): Map<number, ItemCorrection> {
  const byIndex = new Map<number, ItemCorrection>();
  for (const correction of corrections) {
    if (!Number.isInteger(correction.item_index) || correction.item_index < 0 || correction.item_index >= meal.items.length) {
      throw new CorrectionValidationError(`invalid item_index '${correction.item_index}'`);
    }
    if (byIndex.has(correction.item_index)) {
      throw new CorrectionValidationError(`duplicate correction for item ${correction.item_index}`);
    }
    if (correction.food_id === ABSTAIN) {
      throw new CorrectionValidationError('food_id must be a catalogue food, not ABSTAIN');
    }
    validateNumber(correction.quantity, 'quantity');
    if (correction.unit !== undefined && correction.unit !== null && typeof correction.unit !== 'string') {
      throw new CorrectionValidationError('unit must be null or a string');
    }
    validateNumber(correction.grams, 'grams');
    byIndex.set(correction.item_index, correction);
  }
  return byIndex;
}

export function applyCorrections(request: CorrectionRequest): MealLog {
  validateBase(request.meal);
  const config = CONFIGS[request.meal.config];
  if (!config) throw new CorrectionValidationError(`unknown config '${request.meal.config}'`);

  const pack = load(request.meal.locale);
  validateCandidateIds(request.meal, pack.foods);
  const corrections = validateCorrections(request.meal, request.corrections);

  const items = request.meal.items.map((original, index) => {
    const correction = corrections.get(index);
    const foodId = correction?.food_id ?? original.food_id;
    if (foodId === ABSTAIN) {
      return makeResolvedItem({
        ...original,
        food_id: ABSTAIN,
        grams: 0,
        grams_p10: 0,
        grams_p90: 0,
        nutrients: makeNutrients(),
        portion_source: 'not_applicable',
        portion_provenance: 'not_applicable',
        clarification: null,
      });
    }

    const food = pack.foods[foodId];
    if (!food) throw new CorrectionValidationError(`unknown food_id '${foodId}'`);

    const quantity = correction && hasOwn(correction, 'quantity')
      ? correction.quantity ?? null
      : original.quantity;
    const unit = correction && hasOwn(correction, 'unit')
      ? correction.unit ?? null
      : original.unit;
    const countOrigin = correction && (
      hasOwn(correction, 'quantity') || hasOwn(correction, 'unit') || hasOwn(correction, 'grams')
    ) ? 'user_text' as const : original.count_origin;
    validateNumber(quantity, 'quantity');

    const baseline = estimate(food, quantity, unit, pack, undefined, countOrigin);
    if (correction?.grams !== undefined && (correction.grams < baseline.p10 || correction.grams > baseline.p90)) {
      throw new CorrectionValidationError(
        `grams must stay within the existing uncertainty range ${baseline.p10}-${baseline.p90}`,
      );
    }
    const portion = estimate(food, quantity, unit, pack, correction?.grams, countOrigin);
    const candidate = original.candidates.find((entry) => entry.food_id === foodId);
    const confidence = correction?.food_id !== undefined ? candidate?.score ?? 1.0 : original.confidence;
    const nutrients = roundedNutrients(scalePer100g(food.per_100g, portion.grams));

    return makeResolvedItem({
      ...original,
      food_id: foodId,
      confidence,
      quantity,
      unit,
      count_origin: countOrigin,
      grams: portion.grams,
      grams_p10: portion.p10,
      grams_p90: portion.p90,
      nutrients,
      portion_source: portion.source,
      portion_provenance: appendProvenance(portion.provenance, correction),
      clarification: null,
    });
  });

  const totals = roundedNutrients(items
    .filter((item) => item.food_id !== ABSTAIN)
    .reduce(
      (acc, item) => addNutrients(acc, item.nutrients),
      makeNutrients(),
    ));
  let corrected = makeMealLog({
    ...request.meal,
    items,
    totals,
    question: null,
  });
  corrected = route(corrected);
  return addClarifications(corrected, pack);
}
