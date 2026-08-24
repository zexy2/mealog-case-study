import type { MealCorrection, MealLog } from "./types";

function hasOwn(value: object, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

export function buildMealCorrections(
  meal: MealLog,
  portionEdits: Record<number, number>,
  selectedCandidates: Record<number, string>,
  quantityEdits: Record<number, number | null>,
): MealCorrection[] {
  return meal.items.flatMap((item, index) => {
    const correction: MealCorrection = { item_index: index };
    let changed = false;

    const quantityChanged = hasOwn(quantityEdits, String(index)) && quantityEdits[index] !== (item.quantity ?? null);

    if (quantityChanged) {
      correction.quantity = quantityEdits[index];
      if (item.clarification?.kind === "count" && item.clarification.unit) {
        correction.unit = item.clarification.unit;
      }
      changed = true;
    }
    if (hasOwn(selectedCandidates, String(index)) && selectedCandidates[index] !== item.food_id) {
      correction.food_id = selectedCandidates[index];
      changed = true;
    }
    if (hasOwn(portionEdits, String(index)) && portionEdits[index] !== item.grams) {
      if (!quantityChanged || quantityEdits[index] === null) {
        correction.grams = portionEdits[index];
        changed = true;
      }
    }

    return changed ? [correction] : [];
  });
}

/** Replace by idempotency key so opening and re-saving never appends a copy. */
export function replaceSavedMeal(meals: MealLog[], next: MealLog): MealLog[] {
  const existingIndex = meals.findIndex((item) => item.idempotency_key === next.idempotency_key);
  if (existingIndex < 0) return [next, ...meals];
  return meals.map((item, index) => (index === existingIndex ? next : item));
}

/** Remove only local Day state; server has no delete contract. */
export function removeSavedMeal(meals: MealLog[], idempotencyKey: string): MealLog[] {
  return meals.filter((item) => item.idempotency_key !== idempotencyKey);
}
