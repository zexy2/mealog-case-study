/**
 * Confidence routing: what the product does when it is unsure.
 *
 * This is a framework-free port of `server/src/mealog/pipeline/confidence.py`.
 * It routes on the weakest item signal, so one uncertain item gates the meal
 * rather than being hidden by an average. Identity confidence and portion
 * confidence remain separate signals: the former is returned by perception /
 * retrieval, while the latter is derived from the deterministic mass band.
 */

import {
  isAbstained,
  type MealLog,
} from '../domain/models';

export const AUTO_ACCEPT = 0.75;
export const ASK_BELOW = 0.40;
export const VISION_COUNT_CONFIDENCE = 0.60;

/**
 * Map relative p10-p90 width to a bounded confidence signal.
 *
 * A zero-width band scores 1.0. A band as wide as its midpoint scores 0.0.
 * Missing or malformed intervals fail closed instead of allowing an
 * identity-only auto-accept. This is deliberately a separate value: the API's
 * `confidence` field continues to mean identity confidence.
 */
export function portionConfidence(item: MealLog['items'][number]): number {
  const values = [item.grams, item.grams_p10, item.grams_p90];
  if (
    !values.every(Number.isFinite)
    || !(item.grams_p10 > 0 && item.grams_p10 <= item.grams && item.grams <= item.grams_p90)
  ) {
    return 0.0;
  }

  const relativeWidth = (item.grams_p90 - item.grams_p10) / item.grams;
  return Math.round(Math.max(0.0, Math.min(1.0, 1.0 - relativeWidth)) * 1000) / 1000;
}

/** A visual count is evidence, but weaker than a count supplied by the user. */
export function countConfidence(item: MealLog['items'][number]): number {
  return item.count_origin === 'vision' && item.quantity !== null
    ? VISION_COUNT_CONFIDENCE
    : 1.0;
}

/** Use the weaker of identity confidence and portion confidence for routing. */
export function effectiveConfidence(item: MealLog['items'][number]): number {
  return Math.round(Math.min(item.confidence, portionConfidence(item), countConfidence(item)) * 1000) / 1000;
}

const CAPTURE_MEDIUM_QUESTIONS: Readonly<Record<string, string>> = {
  screen: 'This image appears to show food on a screen. Please upload a direct photo of the real meal.',
  printed: 'This image appears to be printed food imagery. Please upload a direct photo of the real meal.',
  toy_or_model: 'This image may show a toy or model rather than real food. Please upload a direct photo of the real meal.',
  unclear: 'I could not confirm this is a direct photo of a real meal. Please upload a clearer meal photo.',
};

/** Any non-real_plate value is a safety red flag, never positive evidence. */
export function captureMediumQuestion(item: MealLog['items'][number]): string | null {
  return item.capture_medium === 'real_plate'
    ? null
    : CAPTURE_MEDIUM_QUESTIONS[item.capture_medium] ?? CAPTURE_MEDIUM_QUESTIONS.unclear;
}

function isTrLocale(locale: string): boolean {
  return (locale || '').toLowerCase().startsWith('tr');
}

/** Route a meal log in place, preserving identity confidence and question text. */
export function route(log: MealLog): MealLog {
  if (log.degraded) {
    log.action = 'review';
    return log;
  }

  if (log.items.length === 0) {
    log.action = 'ask';
    log.question = isTrLocale(log.locale)
      ? 'Bu öğünü okuyamadım. Ne yediniz?'
      : 'I could not read this meal. What did you eat?';
    return log;
  }

  const mediumFlag = log.items.find((item) => item.capture_medium !== 'real_plate');
  if (mediumFlag !== undefined) {
    log.action = 'ask';
    log.question = captureMediumQuestion(mediumFlag);
    return log;
  }

  const unknown = log.items.find(isAbstained);
  if (unknown !== undefined) {
    log.action = 'ask';
    log.question = isTrLocale(log.locale)
      ? `'${unknown.query}' için güvenli bir eşleşme bulunamadı. Hangisi en yakın?`
      : `I could not match '${unknown.query}'. Which of these is closest?`;
    return log;
  }

  // A point mass without quantity evidence can silently turn several visible
  // instances into one catalogue serving. Keep the count unknown and make the
  // user review it; this is additive to the interval gate and does not invent
  // a count or tune either existing threshold.
  if (log.items.some((item) => item.quantity === null)) {
    log.action = 'review';
    return log;
  }

  const lowest = Math.min(...log.items.map(effectiveConfidence));
  if (lowest >= AUTO_ACCEPT) {
    log.action = 'auto_accept';
  } else if (lowest < ASK_BELOW) {
    const item = log.items.reduce((current, candidate) =>
      candidate.confidence < current.confidence ? candidate : current,
    );
    log.action = 'ask';
    log.question = isTrLocale(log.locale)
      ? `'${item.query}' aslında ${item.candidates[0]?.name ?? 'bu yemek'} mi?`
      : `Is '${item.query}' ${item.candidates[0]?.name ?? 'correct'}?`;
  } else {
    log.action = 'review';
  }
  return log;
}

