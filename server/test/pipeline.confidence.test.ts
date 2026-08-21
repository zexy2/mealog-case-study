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
});
