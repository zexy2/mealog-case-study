/**
 * Pick the smallest user question supported by the canonical food evidence.
 *
 * This module deliberately returns data, not locale-specific copy. The mobile
 * client owns wording; the catalogue owns whether a food has a countable
 * serving unit. A review state alone is never enough to show count choices.
 */
import { type ItemClarification, type MealLog, type ResolvedItem } from '../domain/models';
import type { LocalePack } from '../locales/loader';
export declare function clarificationFor(item: ResolvedItem, pack: LocalePack): ItemClarification | null;
export declare function addClarifications(log: MealLog, pack: LocalePack): MealLog;
