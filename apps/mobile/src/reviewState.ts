import type { ResolvedItem } from "./types";

type CountClarificationItem = Pick<ResolvedItem, "clarification" | "quantity">;

export function isCountClarification(item: CountClarificationItem) {
  return item.clarification?.kind === "count";
}

/**
 * Smart Pre-selection: For discrete countable items with an open count question,
 * the client defaults to 1 adet (the standard baseline) so that the user is not
 * blocked with a locked CTA button.
 */
export function getEffectiveQuantity(
  item: CountClarificationItem,
  hasQuantityEdit: boolean,
  quantityEdit: number | null | undefined,
): number | null {
  if (hasQuantityEdit) {
    return quantityEdit ?? null;
  }
  if (item.quantity !== null && item.quantity !== undefined) {
    return item.quantity;
  }
  return 1; // Smart default: 1 unit pre-selected
}

/** An open count question is pre-selected to 1 by default, so it does not block saving. */
export function countAnswerPending(_item: CountClarificationItem, _hasQuantityEdit: boolean) {
  return false;
}

/**
 * Count edits change the server-side portion calculation. When quantity > 1,
 * the client awaits server recalculation. When quantity is 1 or null (standard portion),
 * the baseline catalogue values remain valid.
 */
export function computedValuesNeedServerRefresh(
  item: CountClarificationItem,
  hasQuantityEdit: boolean,
  quantity: number | null | undefined,
) {
  if (!isCountClarification(item)) return false;
  if (hasQuantityEdit && typeof quantity === "number" && quantity !== 1) return true;
  return false;
}

