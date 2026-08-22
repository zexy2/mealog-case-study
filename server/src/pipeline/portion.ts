/**
 * Evidence-graded mass estimation.
 *
 * The returned value is a distribution, not a point estimate: `grams` is the
 * deterministic midpoint used by nutrition, while `p10` and `p90` carry the
 * uncertainty that the confidence stage must see. This module is pure and
 * framework-free so the API and the offline evaluator can share it.
 *
 * Ported from `server/src/mealog/pipeline/portion.py`. Field names remain
 * snake_case because they cross the API and fixture boundary.
 */

import type { CanonicalFood, CountOrigin } from '../domain/models';

/** Catalogue-default evidence band. */
export const DEFAULT_SPREAD = [0.65, 1.45] as const;

/** Stated quantity plus a known unit: stronger, but not weighed, evidence. */
export const EXPLICIT_UNIT_SPREAD = [0.8, 1.25] as const;

/** Missing quantity still gets the unit centre, not explicit-unit confidence. */
export const ASSUMED_QUANTITY_SPREAD = DEFAULT_SPREAD;

/** Unknown density must be visible to confidence routing. */
export const UNKNOWN_DENSITY_SPREAD = [0.45, 1.75] as const;
export const UNKNOWN_DENSITY_MIDPOINT_G_PER_ML = 1.0;

/** Printed serving/net weight is strong mass evidence, not a weighed meal. */
export const LABEL_SERVING_SPREAD = [0.9, 1.1] as const;

/** Quantity-only fallback keeps a little more uncertainty than a unit. */
export const CATALOGUE_DEFAULT_SCALED_SPREAD = [0.75, 1.35] as const;

export interface UnitConversion {
  g?: number;
  ml?: number;
}

/** Minimal structural contract; the locale loader owns the concrete pack. */
export interface PortionLocalePack {
  units: ReadonlyMap<string, UnitConversion> | Readonly<Record<string, UnitConversion>>;
}

export type PortionQuantity = number | null | undefined;
export type PortionUnit = string | null | undefined;

export type PortionSource =
  | 'catalogue_default'
  | 'catalogue_default_scaled'
  | 'vision_count'
  | 'explicit_unit'
  | 'assumed_unit'
  | 'known_density'
  | 'assumed_density'
  | 'unknown_density'
  | 'label_serving'
  | 'net_weight'
  | 'packaged_fallback';

export interface PortionEstimate {
  grams: number;
  p10: number;
  p90: number;
  source: PortionSource;
  provenance: string;
}

function pythonRoundOne(value: number): number {
  // Python's round(value, 1) uses ties-to-even; Math.round does not. Most
  // portions do not land on a tie, but preserving this rule avoids a silent
  // parity drift on a boundary value.
  const scaled = value * 10;
  const lower = Math.floor(scaled);
  const fraction = scaled - lower;
  if (Math.abs(fraction - 0.5) < Number.EPSILON * Math.max(1, Math.abs(scaled))) {
    return (lower % 2 === 0 ? lower : lower + 1) / 10;
  }
  return Math.round(scaled) / 10;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? `${value}` : `${value}`;
}

function formatPythonRepr(value: PortionQuantity): string {
  if (value === null || value === undefined) {
    return 'None';
  }
  return Number.isInteger(value) ? `${value}.0` : `${value}`;
}

function result(
  grams: number,
  spread: readonly [number, number],
  source: PortionSource,
  provenance: string,
): PortionEstimate {
  return {
    grams: pythonRoundOne(grams),
    p10: pythonRoundOne(grams * spread[0]),
    p90: pythonRoundOne(grams * spread[1]),
    source,
    provenance,
  };
}

function unitConversion(
  pack: PortionLocalePack,
  unit: string,
): UnitConversion | undefined {
  if ('get' in pack.units && typeof pack.units.get === 'function') {
    return pack.units.get(unit);
  }
  return (pack.units as Readonly<Record<string, UnitConversion>>)[unit];
}

function normalizeServingUnit(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .toLocaleLowerCase('tr-TR')
    .replace(/\p{Diacritic}/gu, '')
    .replaceAll('ı', 'i')
    .replace(/[\s_]+/gu, '_');
}

function leadingCount(value: string): { count: number; unit: string } | undefined {
  const match = /^\s*(\d+(?:[.,]\d+)?(?:\s+\d+\s*\/\s*\d+|\s*\/\s*\d+)?)\s+(.+?)\s*$/u.exec(value);
  if (match === null) return undefined;

  const countParts = match[1].replace(',', '.').trim().split(/\s+/u);
  let count: number;
  if (countParts.length === 2 && countParts[1].includes('/')) {
    const [numerator, denominator] = countParts[1].split('/', 2).map(Number);
    count = Number(countParts[0]) + numerator / denominator;
  } else if (countParts.length === 1 && countParts[0].includes('/')) {
    const [numerator, denominator] = countParts[0].split('/', 2).map(Number);
    count = numerator / denominator;
  } else {
    count = Number(countParts[0]);
  }
  if (!Number.isFinite(count) || count <= 0) return undefined;
  return { count, unit: match[2] };
}

function cataloguePerUnitGrams(
  food: CanonicalFood,
  requestedUnit: PortionUnit,
): number | undefined {
  if (!requestedUnit) return undefined;
  const serving = leadingCount(food.default_serving_name);
  if (serving === undefined) return undefined;
  if (normalizeServingUnit(serving.unit) !== normalizeServingUnit(requestedUnit)) {
    return undefined;
  }
  return food.default_serving_g / serving.count;
}

function packagedPortion(food: CanonicalFood): PortionEstimate | undefined {
  /** Product records win over provider hints such as `32 oz container`. */
  if (food.serving_size_g !== null && food.serving_size_g !== undefined) {
    return result(
      food.serving_size_g,
      LABEL_SERVING_SPREAD,
      'label_serving',
      food.serving_size_source || 'packaged product serving_size_g',
    );
  }

  if (food.net_weight_g !== null && food.net_weight_g !== undefined) {
    return result(
      food.net_weight_g,
      LABEL_SERVING_SPREAD,
      'net_weight',
      food.net_weight_source || 'packaged product net_weight_g',
    );
  }

  if (food.packaged) {
    return result(
      food.default_serving_g,
      DEFAULT_SPREAD,
      'packaged_fallback',
      'fallback=catalogue.default_serving_g; '
        + 'product record has no serving_size_g or net_weight_g',
    );
  }

  return undefined;
}

function spreadForUnit(quantity: PortionQuantity): readonly [number, number] {
  return quantity !== null && quantity !== undefined
    ? EXPLICIT_UNIT_SPREAD
    : ASSUMED_QUANTITY_SPREAD;
}

/**
 * Estimate food mass from product evidence, a unit conversion, or the
 * catalogue default. Volume is never treated as grams: a food density is
 * required for a narrow result, otherwise UNKNOWN_DENSITY_SPREAD is returned.
 */
export function estimate(
  food: CanonicalFood,
  quantity: PortionQuantity,
  unit: PortionUnit,
  pack: PortionLocalePack,
  correctionGrams?: number,
  countOrigin: CountOrigin = null,
): PortionEstimate {
  if (correctionGrams !== undefined) {
    if (!Number.isFinite(correctionGrams) || correctionGrams <= 0) {
      throw new Error('correction grams must be positive');
    }
    return result(
      correctionGrams,
      EXPLICIT_UNIT_SPREAD,
      'explicit_unit',
      `unit=g; quantity=${formatPythonRepr(correctionGrams)}; correction=user_confirmed`,
    );
  }

  const packaged = packagedPortion(food);
  if (packaged !== undefined) {
    return packaged;
  }

  let grams = food.default_serving_g;
  let spread: readonly [number, number] = DEFAULT_SPREAD;
  let source: PortionSource = 'catalogue_default';
  let provenance = `catalogue.default_serving_g=${formatNumber(food.default_serving_g)}`;

  if (countOrigin === 'vision' && quantity !== null && quantity !== undefined) {
    grams = food.default_serving_g * quantity;
    spread = CATALOGUE_DEFAULT_SCALED_SPREAD;
    source = 'vision_count';
    provenance = `count=${formatNumber(quantity)}; count_origin=vision; fallback=catalogue.default_serving_g=${formatNumber(food.default_serving_g)}; unit=unknown`;
  } else {
    const perUnitGrams = cataloguePerUnitGrams(food, unit);
    if (perUnitGrams !== undefined) {
      const multiplier = quantity !== null && quantity !== undefined ? quantity : 1.0;
      grams = perUnitGrams * multiplier;
      spread = spreadForUnit(quantity);
      source = quantity !== null && quantity !== undefined ? 'explicit_unit' : 'assumed_unit';
      provenance = `unit=${unit}; quantity=${formatPythonRepr(quantity)}; per_unit_g=${formatNumber(perUnitGrams)}; source=catalogue_serving`;
    } else {
      const conversion = unit ? unitConversion(pack, unit) : undefined;
      if (conversion !== undefined) {
        const multiplier = quantity !== null && quantity !== undefined ? quantity : 1.0;
        if (conversion.g) {
          grams = conversion.g * multiplier;
          spread = spreadForUnit(quantity);
          source = quantity !== null && quantity !== undefined ? 'explicit_unit' : 'assumed_unit';
          provenance = `unit=${unit}; quantity=${formatPythonRepr(quantity)}; conversion_g=${formatNumber(conversion.g)}`;
        } else if (conversion.ml) {
          const density = food.density_g_per_ml;
          if (typeof density === 'number' && density > 0) {
            grams = conversion.ml * density * multiplier;
            spread = spreadForUnit(quantity);
            source = quantity !== null && quantity !== undefined ? 'known_density' : 'assumed_density';
            provenance = `unit=${unit}; quantity=${formatPythonRepr(quantity)}; density_g_per_ml=${formatNumber(density)}; density_source=${food.density_source}`;
          } else {
            grams = conversion.ml * UNKNOWN_DENSITY_MIDPOINT_G_PER_ML * multiplier;
            spread = UNKNOWN_DENSITY_SPREAD;
            source = 'unknown_density';
            provenance = `unit=${unit}; quantity=${formatPythonRepr(quantity)}; density_missing; midpoint_g_per_ml=1.0`;
          }
        }
      } else if (quantity !== null && quantity !== undefined) {
        grams = food.default_serving_g * quantity;
        spread = CATALOGUE_DEFAULT_SCALED_SPREAD;
        source = 'catalogue_default_scaled';
        provenance = `fallback=catalogue.default_serving_g=${formatNumber(food.default_serving_g)}; quantity=${formatNumber(quantity)}; unit=unknown`;
      }
    }
  }

  return result(grams, spread, source, provenance);
}

/*
 * Portion hints are normalized before estimate() in the complete runner. The
 * helper is kept here as a small pure compatibility seam for callers that
 * have not yet adopted normalize.ts. It intentionally returns an unknown unit
 * unchanged so estimate() falls back rather than inventing a conversion.
 */
const VULGAR_FRACTIONS: Readonly<Record<string, number>> = {
  '¼': 0.25,
  '½': 0.5,
  '¾': 0.75,
  '⅐': 1 / 7,
  '⅑': 1 / 9,
  '⅒': 0.1,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅕': 0.2,
  '⅖': 0.4,
  '⅗': 0.6,
  '⅘': 0.8,
  '⅙': 1 / 6,
  '⅚': 5 / 6,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
};

const WORD_NUMBERS: Readonly<Record<string, number>> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  half: 0.5,
  quarter: 0.25,
  bir: 1,
  iki: 2,
  uc: 3,
  üç: 3,
  dort: 4,
  dört: 4,
  bes: 5,
  beş: 5,
  alti: 6,
  altı: 6,
  yedi: 7,
  sekiz: 8,
  dokuz: 9,
  on: 10,
  yarim: 0.5,
  yarım: 0.5,
  ceyrek: 0.25,
  çeyrek: 0.25,
};

const HALF_WORDS = new Set(['a', 'buçuk', 'bucuk', 'and']);
const SKIP_AFTER_QUANTITY = new Set(['a', 'an', 'of', 'and']);

function tokens(text: string): Array<{ value: string; start: number; end: number }> {
  const found: Array<{ value: string; start: number; end: number }> = [];
  const tokenPattern = /[\p{L}\p{N}_]+(?:[-'][\p{L}\p{N}_]+)*/gu;
  for (const match of text.matchAll(tokenPattern)) {
    const value = match[0];
    const start = match.index ?? 0;
    found.push({ value, start, end: start + value.length });
  }
  return found;
}

function unitAfter(text: string, end: number): string | null {
  for (const token of tokens(text.slice(end))) {
    if (!SKIP_AFTER_QUANTITY.has(token.value)) {
      return token.value;
    }
  }
  return null;
}

function parseNumeric(raw: string): number {
  const stripped = raw.trim();
  const vulgar = VULGAR_FRACTIONS[stripped];
  if (vulgar !== undefined) {
    return vulgar;
  }
  const normalized = stripped.replace(',', '.');
  const mixed = normalized.split(/\s+/);
  if (mixed.length === 2 && mixed[1].includes('/')) {
    const [numerator, denominator] = mixed[1].split('/', 2);
    return Number(mixed[0]) + Number(numerator) / Number(denominator);
  }
  const compact = normalized.replace(/\s+/g, '');
  if (compact.includes('/')) {
    const [numerator, denominator] = compact.split('/', 2);
    return Number(numerator) / Number(denominator);
  }
  return Number(compact);
}

function wordQuantity(text: string): [number, string | null] | null {
  const found = tokens(text);
  for (let index = 0; index < found.length; index += 1) {
    const value = WORD_NUMBERS[found[index].value];
    if (value === undefined) {
      continue;
    }

    const end = found[index].end;
    let nextIndex = index + 1;
    if (value >= 1 && nextIndex < found.length) {
      let modifier = found[nextIndex].value;
      if (HALF_WORDS.has(modifier)) {
        if (modifier === 'and' && nextIndex < found.length) {
          nextIndex += 1;
          if (nextIndex < found.length && found[nextIndex].value === 'a') {
            nextIndex += 1;
          }
          if (nextIndex < found.length) {
            modifier = found[nextIndex].value;
          }
        }
        if (modifier === 'half' || modifier === 'buçuk' || modifier === 'bucuk') {
          return [value + 0.5, unitAfter(text, found[nextIndex].end)];
        }
      }
    }
    return [value, unitAfter(text, end)];
  }
  return null;
}

/** Parse common English/Turkish quantity words and numeric fractions. */
export function parsePortion(hint: string | null | undefined): [number | null, string | null] {
  if (!hint) {
    return [null, null];
  }
  const text = hint.toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim();
  const numeric = /(?:\d+(?:[.,]\d+)?\s+\d+\s*\/\s*\d+|\d+\s*\/\s*\d+|\d+(?:[.,]\d+)?|[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/u.exec(text);
  if (numeric !== null) {
    return [parseNumeric(numeric[0]), unitAfter(text, numeric.index + numeric[0].length)];
  }
  return wordQuantity(text) ?? [null, text || null];
}
