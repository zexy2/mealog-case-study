import { describe, expect, it } from 'vitest';

import {
  ABSTAIN,
  makeMealLog,
  makeResolvedItem,
  type Candidate,
  type MealLog,
} from '../src/domain/models';
import {
  ASK_BELOW,
  AUTO_ACCEPT,
  effectiveConfidence,
  portionConfidence,
  route,
} from '../src/pipeline/confidence';

const candidate = (name: string): Candidate => ({
  food_id: `test.${name}`,
  name,
  score: 1,
});

const meal = (...items: ReturnType<typeof makeResolvedItem>[]): MealLog =>
  makeMealLog({ idempotency_key: 'test-key', locale: 'en_US', items });

const item = (query: string, confidence: number, name = 'matched food') =>
  makeResolvedItem({
    query,
    food_id: `test.${query}`,
    confidence,
    candidates: [candidate(name)],
    grams: 100,
    grams_p10: 90,
    grams_p90: 110,
    quantity: 1,
    unit: 'serving',
  });

describe('confidence routing', () => {
  it('auto-accepts when every item meets the boundary', () => {
    const log = route(meal(
      item('eggs', AUTO_ACCEPT),
      item('rice', 0.99),
    ));

    expect(log.action).toBe('auto_accept');
    expect(log.question).toBeNull();
  });

  it('never auto-accepts a degraded meal, even when every item is confident', () => {
    const log = meal(item('eggs', 0.99));
    log.degraded = true;

    expect(route(log).action).toBe('review');
  });

  it('uses the weakest item to gate a meal into review', () => {
    const log = route(meal(
      item('eggs', 0.99),
      item('rice', AUTO_ACCEPT - 0.01),
    ));

    expect(log.action).toBe('review');
    expect(log.question).toBeNull();
  });

  it('asks about the weakest item below the ask boundary', () => {
    const log = route(meal(
      item('eggs', 0.99),
      item('rice', ASK_BELOW - 0.01, 'white rice'),
    ));

    expect(log.action).toBe('ask');
    expect(log.question).toBe("Is 'rice' white rice?");
  });

  it('keeps both routing boundaries exact', () => {
    expect(route(meal(item('auto', AUTO_ACCEPT))).action).toBe('auto_accept');
    expect(route(meal(item('review', ASK_BELOW))).action).toBe('review');
  });

  it('asks when any item abstains, even if other items are confident', () => {
    const log = route(meal(
      item('eggs', 0.99),
      makeResolvedItem({ query: 'unknown', food_id: ABSTAIN, confidence: 0.99 }),
    ));

    expect(log.action).toBe('ask');
    expect(log.question).toBe("I could not match 'unknown'. Which of these is closest?");
  });

  it('asks for an empty meal', () => {
    const log = route(meal());

    expect(log.action).toBe('ask');
    expect(log.question).toBe('I could not read this meal. What did you eat?');
  });

  it('keeps identity confidence separate from portion confidence', () => {
    const resolved = item('ayran', 1);
    resolved.grams = 200;
    resolved.grams_p10 = 150;
    resolved.grams_p90 = 270;

    const log = route(meal(resolved));

    expect(portionConfidence(resolved)).toBe(0.4);
    expect(effectiveConfidence(resolved)).toBe(0.4);
    expect(resolved.confidence).toBe(1);
    expect(log.action).toBe('review');
  });

  it('asks instead of auto-accepting a wide portion band', () => {
    const resolved = item('rice', 0.99);
    resolved.grams = 100;
    resolved.grams_p10 = 45;
    resolved.grams_p90 = 175;

    const log = route(meal(resolved));

    expect(portionConfidence(resolved)).toBe(0);
    expect(log.action).toBe('ask');
    expect(resolved.confidence).toBe(0.99);
  });

  it('fails closed when the portion interval is missing', () => {
    const resolved = item('rice', 0.99);
    resolved.grams = 0;
    resolved.grams_p10 = 0;
    resolved.grams_p90 = 0;

    const log = route(meal(resolved));

    expect(portionConfidence(resolved)).toBe(0);
    expect(log.action).toBe('ask');
  });

  it('routes an unknown quantity to review without inventing a count', () => {
    const resolved = makeResolvedItem({
      query: 'simit',
      food_id: 'tr.simit',
      candidates: [candidate('simit')],
      confidence: 1,
      grams: 100,
      grams_p10: 65,
      grams_p90: 145,
    });

    const log = route(meal(resolved));

    expect(resolved.quantity).toBeNull();
    expect(resolved.unit).toBeNull();
    expect(log.action).toBe('review');
  });
});
