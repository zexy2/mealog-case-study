import type { ResolvedItem } from "./types";

type CountClarificationItem = Pick<ResolvedItem, "clarification" | "quantity">;

function isCountClarification(item: CountClarificationItem) {
  return item.clarification?.kind === "count";
}

/** A missing count must not be rendered as the catalogue-default portion. */
export function countAnswerPending(item: CountClarificationItem, hasQuantityEdit: boolean) {
  return isCountClarification(item)
    && !hasQuantityEdit
    && (item.quantity === null || item.quantity === undefined);
}

/**
 * Count edits change the server-side portion calculation. The client must wait
 * for that correction rather than scale grams or nutrients locally.
 */
export function computedValuesNeedServerRefresh(
  item: CountClarificationItem,
  hasQuantityEdit: boolean,
  quantity: number | null | undefined,
) {
  if (!isCountClarification(item)) return false;
  if (countAnswerPending(item, hasQuantityEdit)) return true;
  return hasQuantityEdit && typeof quantity === "number";
}
