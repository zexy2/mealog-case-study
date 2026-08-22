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

export const ABSTAIN = 'ABSTAIN';

export interface Nutrients {
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
}

/** Pydantic field defaults for `Nutrients`: every macro defaults to 0.0. */
export function makeNutrients(init: Partial<Nutrients> = {}): Nutrients {
  return {
    kcal: init.kcal ?? 0.0,
    protein_g: init.protein_g ?? 0.0,
    carb_g: init.carb_g ?? 0.0,
    fat_g: init.fat_g ?? 0.0,
  };
}

/** `Nutrients.__add__` */
export function addNutrients(a: Nutrients, b: Nutrients): Nutrients {
  return {
    kcal: a.kcal + b.kcal,
    protein_g: a.protein_g + b.protein_g,
    carb_g: a.carb_g + b.carb_g,
    fat_g: a.fat_g + b.fat_g,
  };
}

/** `Nutrients.rounded` */
export function roundedNutrients(n: Nutrients, nd = 1): Nutrients {
  const factor = 10 ** nd;
  const round = (v: number): number => Math.round(v * factor) / factor;
  return {
    kcal: round(n.kcal),
    protein_g: round(n.protein_g),
    carb_g: round(n.carb_g),
    fat_g: round(n.fat_g),
  };
}

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
export function validateCanonicalFood(food: CanonicalFood): CanonicalFood {
  if ((food.serving_size_g === null) !== (food.serving_size_source === null)) {
    throw new Error('serving_size_g and serving_size_source must be provided together');
  }
  if (food.serving_size_g !== null && food.serving_size_g <= 0) {
    throw new Error('serving_size_g must be positive');
  }
  if (food.serving_size_g !== null && !(food.serving_size_source ?? '').trim()) {
    throw new Error('serving_size_source must not be empty');
  }
  if (food.serving_size_name !== null && food.serving_size_g === null) {
    throw new Error('serving_size_name requires serving_size_g');
  }
  if ((food.net_weight_g === null) !== (food.net_weight_source === null)) {
    throw new Error('net_weight_g and net_weight_source must be provided together');
  }
  if (food.net_weight_g !== null && food.net_weight_g <= 0) {
    throw new Error('net_weight_g must be positive');
  }
  if (food.net_weight_g !== null && !(food.net_weight_source ?? '').trim()) {
    throw new Error('net_weight_source must not be empty');
  }
  if ((food.density_g_per_ml === null) !== (food.density_source === null)) {
    throw new Error('density_g_per_ml and density_source must be provided together');
  }
  if (food.density_g_per_ml !== null && food.density_g_per_ml <= 0) {
    throw new Error('density_g_per_ml must be positive');
  }
  if (food.density_g_per_ml !== null && !(food.density_source ?? '').trim()) {
    throw new Error('density_source must not be empty');
  }
  return food;
}

/**
 * Raw output of the vision/text stage. Deliberately has no food_id and no
 * nutrients -- only what was *observed*.
 */
export interface PerceivedItem {
  surface_form: string;
  cooking_method: string | null;
  portion_hint: string | null;
  confidence: number;
  /**
   * Only populated by the V0 baseline, which asks the model for calories
   * directly. Kept so the ablation can quantify what grounding buys us.
   */
  ungrounded_kcal: number | null;
}

export function makePerceivedItem(
  init: Partial<PerceivedItem> & Pick<PerceivedItem, 'surface_form'>,
): PerceivedItem {
  return {
    surface_form: init.surface_form,
    cooking_method: init.cooking_method ?? null,
    portion_hint: init.portion_hint ?? null,
    confidence: init.confidence ?? 0.5,
    ungrounded_kcal: init.ungrounded_kcal ?? null,
  };
}

export interface NormalizedItem {
  original: PerceivedItem;
  /** locale-normalized retrieval key */
  query: string;
  quantity: number | null;
  unit: string | null;
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
  grams: number;
  grams_p10: number;
  grams_p90: number;
  confidence: number;
  nutrients: Nutrients;
  portion_source: string;
  portion_provenance: string;
  clarification: ItemClarification | null;
}

export function makeResolvedItem(
  init: Partial<ResolvedItem> & Pick<ResolvedItem, 'query'>,
): ResolvedItem {
  return {
    query: init.query,
    food_id: init.food_id ?? ABSTAIN,
    candidates: init.candidates ?? [],
    quantity: init.quantity ?? null,
    unit: init.unit ?? null,
    grams: init.grams ?? 0.0,
    grams_p10: init.grams_p10 ?? 0.0,
    grams_p90: init.grams_p90 ?? 0.0,
    confidence: init.confidence ?? 0.0,
    nutrients: init.nutrients ?? makeNutrients(),
    portion_source: init.portion_source ?? 'not_applicable',
    portion_provenance: init.portion_provenance ?? 'not_applicable',
    clarification: init.clarification ?? null,
  };
}

/** `ResolvedItem.abstained` */
export function isAbstained(item: ResolvedItem): boolean {
  return item.food_id === ABSTAIN;
}

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
}

export function makeMealLog(
  init: Partial<MealLog> & Pick<MealLog, 'idempotency_key' | 'locale'>,
): MealLog {
  return {
    idempotency_key: init.idempotency_key,
    locale: init.locale,
    cuisine: init.cuisine ?? null,
    items: init.items ?? [],
    totals: init.totals ?? makeNutrients(),
    action: init.action ?? 'review',
    question: init.question ?? null,
    config: init.config ?? 'V3',
  };
}
