/**
 * Confidence routing: what the product does when it is unsure.
 *
 * This is a framework-free port of `server/src/mealog/pipeline/confidence.py`.
 * It routes on the weakest item signal, so one uncertain item gates the meal
 * rather than being hidden by an average. D11's portion-uncertainty gate is a
 * separate, specified-but-unshipped decision and is not implemented here.
 */

import {
  isAbstained,
  type MealLog,
} from '../domain/models';

export const AUTO_ACCEPT = 0.75;
export const ASK_BELOW = 0.40;

/** Route a meal log in place, preserving the Python action and question text. */
export function route(log: MealLog): MealLog {
  if (log.items.length === 0) {
    log.action = 'ask';
    log.question = 'I could not read this meal. What did you eat?';
    return log;
  }

  const unknown = log.items.find(isAbstained);
  if (unknown !== undefined) {
    log.action = 'ask';
    log.question = `I could not match '${unknown.query}'. Which of these is closest?`;
    return log;
  }

  const lowest = Math.min(...log.items.map((item) => item.confidence));
  if (lowest >= AUTO_ACCEPT) {
    log.action = 'auto_accept';
  } else if (lowest < ASK_BELOW) {
    const item = log.items.reduce((current, candidate) =>
      candidate.confidence < current.confidence ? candidate : current,
    );
    log.action = 'ask';
    log.question = `Is '${item.query}' ${item.candidates[0]?.name ?? 'correct'}?`;
  } else {
    log.action = 'review';
  }
  return log;
}
