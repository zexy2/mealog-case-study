/**
 * Pick the smallest user question supported by the canonical food evidence.
 *
 * This module deliberately returns data, not locale-specific copy. The mobile
 * client owns wording; the catalogue owns whether a food has a countable
 * serving unit. A review state alone is never enough to show count choices.
 */

import {
  ABSTAIN,
  type ItemClarification,
  type MealLog,
  type ResolvedItem,
} from '../domain/models';
import { AUTO_ACCEPT } from './confidence';
import type { LocalePack } from '../locales/loader';

function countUnit(item: ResolvedItem, pack: LocalePack): string | null {
  const food = pack.foods[item.food_id];
  if (!food) return null;

  const match = /^\s*1\s+(.+?)\s*$/u.exec(food.default_serving_name);
  const unit = match?.[1]?.split(/\s+/u)[0];
  if (!unit) return null;

  const conversion = pack.units[unit];
  return conversion && typeof conversion.g === 'number' && conversion.g > 0
    ? unit
    : null;
}

export function clarificationFor(
  item: ResolvedItem,
  pack: LocalePack,
): ItemClarification | null {
  if (item.food_id === ABSTAIN) {
    return item.candidates.length > 0
      ? { kind: 'identity', unit: null, options: [] }
      : null;
  }

  const unit = countUnit(item, pack);
  if (item.quantity === null && unit !== null && item.confidence >= AUTO_ACCEPT) {
    return { kind: 'count', unit, options: [1, 2, 3, null] };
  }

  if (item.confidence < AUTO_ACCEPT) {
    return { kind: 'identity', unit: null, options: [] };
  }

  if (item.grams_p90 > item.grams_p10) {
    return {
      kind: 'portion',
      unit: null,
      options: [],
    };
  }

  return null;
}

export function addClarifications(log: MealLog, pack: LocalePack): MealLog {
  log.items = log.items.map((item) => ({
    ...item,
    clarification: clarificationFor(item, pack),
  }));
  return log;
}
