/**
 * Pipeline orchestration and ablation configurations.
 *
 * This is a framework-free port of `server/src/mealog/pipeline/runner.py`.
 * The only external boundary is VisionPort: adapters are supplied by the
 * caller, while every grounded stage remains a pure pipeline module.
 */

import {
  ABSTAIN,
  addNutrients,
  makeMealLog,
  makeNutrients,
  makeResolvedItem,
  roundedNutrients,
  type MealLog,
  type ResolvedItem,
} from '../domain/models';
import { load } from '../locales/loader';
import { normalize } from './normalize';
import { estimate } from './portion';
import { createRetrieval } from './retrieval/index';
import { resolve } from './resolve';
import { captureMediumQuestion, route } from './confidence';
import { addClarifications } from './clarification';
import { scalePer100g } from './nutrition';
import { VisionInput, type VisionPort } from './ports';

export interface Config {
  readonly name: string;
  readonly description: string;
  readonly grounded: boolean;
  readonly locale_rules: boolean;
  readonly gating: boolean;
}

export const CONFIGS: Readonly<Record<string, Config>> = {
  V0: {
    name: 'V0',
    description: 'single-prompt VLM, model reports calories directly',
    grounded: false,
    locale_rules: false,
    gating: false,
  },
  V1: {
    name: 'V1',
    description: '+ closed-set resolution, nutrition computed from catalogue',
    grounded: true,
    locale_rules: false,
    gating: false,
  },
  V2: {
    name: 'V2',
    description: '+ locale text and unit normalization',
    grounded: true,
    locale_rules: true,
    gating: false,
  },
  V3: {
    name: 'V3',
    description: '+ confidence gating and abstention',
    grounded: true,
    locale_rules: true,
    gating: true,
  },
};

const retrieval = createRetrieval();

/**
 * Collapse repeated grounded observations without ever collapsing abstentions.
 * ABSTAIN is a sentinel, not a food, so two different unmatched queries must
 * remain visible as two questions. A known count can be added; one unknown
 * contribution makes the merged count unknown.
 */
function reconcileResolved(items: ResolvedItem[]): ResolvedItem[] {
  const byFood = new Map<string, ResolvedItem>();
  const reconciled: ResolvedItem[] = [];

  for (const item of items) {
    if (item.food_id === ABSTAIN) {
      reconciled.push(item);
      continue;
    }

    const existing = byFood.get(item.food_id);
    if (existing === undefined) {
      byFood.set(item.food_id, item);
      reconciled.push(item);
      continue;
    }

    existing.quantity = existing.quantity === null || item.quantity === null
      ? null
      : existing.quantity + item.quantity;
    existing.unit = existing.unit === item.unit ? existing.unit : null;
    existing.count_origin = existing.count_origin === item.count_origin
      ? existing.count_origin
      : existing.count_origin === 'vision' || item.count_origin === 'vision'
        ? 'vision'
        : existing.count_origin ?? item.count_origin;
    if (existing.capture_medium === 'real_plate' && item.capture_medium !== 'real_plate') {
      existing.capture_medium = item.capture_medium;
    }
    existing.confidence = Math.min(existing.confidence, item.confidence);
  }

  return reconciled;
}

function ungroundedLog(
  perceived: Awaited<ReturnType<VisionPort['perceive']>>['observations'],
  degraded: boolean,
  idempotencyKey: string,
  locale: string,
  config: Config,
): MealLog {
  const items = perceived.map((item) => makeResolvedItem({
    query: item.surface_form,
    food_id: `ungrounded:${item.surface_form}`,
    confidence: item.confidence,
    capture_medium: item.capture_medium,
    nutrients: makeNutrients({ kcal: item.ungrounded_kcal || 0.0 }),
  }));

  const totals = items.reduce(
    (acc, item) => addNutrients(acc, item.nutrients),
    makeNutrients(),
  );
  const mediumFlag = items.find((item) => item.capture_medium !== 'real_plate');
  return makeMealLog({
    idempotency_key: idempotencyKey,
    locale,
    config: config.name,
    items,
    totals: roundedNutrients(totals),
    action: degraded ? 'review' : mediumFlag === undefined ? 'auto_accept' : 'ask',
    question: mediumFlag === undefined ? null : captureMediumQuestion(mediumFlag),
    degraded,
  });
}

/**
 * Run one meal through perception, normalization, retrieval, resolution,
 * portion, nutrition, and (for V3) confidence routing.
 *
 * `inputRef: string` preserves the Python runner's fixture compatibility path;
 * live callers should pass a VisionInput. A provided VisionPort may be sync or
 * async, which keeps handwritten test stubs as small as the production port.
 */
export async function run(
  vision: VisionPort,
  inputRef: VisionInput | string,
  locale: string,
  config: Config,
  idempotencyKey: string,
  text: string | null = null,
): Promise<MealLog> {
  let input: VisionInput;
  if (typeof inputRef === 'string') {
    input = new VisionInput({ sampleId: inputRef, text });
  } else {
    if (text !== null) {
      throw new TypeError('text must be part of VisionInput');
    }
    input = inputRef;
  }

  const pack = load(locale);
  const perception = await vision.perceive(input);
  const perceived = perception.observations;
  const degraded = perception.degraded;

  if (!config.grounded) {
    return ungroundedLog(perceived, degraded, idempotencyKey, locale, config);
  }

  const normalized = normalize(
    perceived,
    pack,
    config.locale_rules,
  );
  const resolved: ResolvedItem[] = [];

  for (const item of normalized) {
    const candidates = retrieval.search(item.query, pack);
    const result = resolve(item.query, candidates, config.gating);
    result.quantity = item.quantity;
    result.unit = item.unit;
    result.count_origin = item.count_origin;
    result.capture_medium = item.original.capture_medium;

    // Keep ABSTAIN as an item. In particular, do not run it through portion or
    // nutrition: a missing catalogue food is not a zero-calorie food.
    resolved.push(result);
  }

  const reconciled = reconcileResolved(resolved);
  for (const result of reconciled) {
    if (result.food_id === ABSTAIN) {
      continue;
    }

    const food = pack.foods[result.food_id];
    // A missing count is not an implicit one. Keep the item on the catalogue
    // default path even when an uncounted hint happened to name a unit.
    const portion = estimate(
      food,
      result.quantity,
      result.quantity === null ? null : result.unit,
      pack,
      undefined,
      result.count_origin,
    );
    result.grams = portion.grams;
    result.grams_p10 = portion.p10;
    result.grams_p90 = portion.p90;
    result.portion_source = portion.source;
    result.portion_provenance = portion.provenance;
    result.nutrients = roundedNutrients(scalePer100g(food.per_100g, result.grams));
  }

  const totals = reconciled
    .filter((item) => item.food_id !== ABSTAIN)
    .reduce(
      (acc, item) => addNutrients(acc, item.nutrients),
      makeNutrients(),
    );
  let log = makeMealLog({
    idempotency_key: idempotencyKey,
    locale,
    config: config.name,
    items: reconciled,
    totals: roundedNutrients(totals),
    degraded,
  });

  if (degraded) {
    // Provider fallback is never a first-class accepted answer, regardless of
    // identity or portion confidence. The status came from this request's
    // perception envelope, not from mutable adapter state.
    log.action = 'review';
  } else if (config.gating) {
    log = route(log);
  } else {
    const mediumFlag = reconciled.find((item) => item.capture_medium !== 'real_plate');
    if (mediumFlag !== undefined) {
      log.action = 'ask';
      log.question = captureMediumQuestion(mediumFlag);
    } else {
      log.action = 'auto_accept';
    }
  }
  return addClarifications(log, pack);
}
