import { describe, expect, it } from 'vitest';

import { ABSTAIN, type Candidate } from '../src/domain/models';
import {
  MIN_ACCEPT_SCORE,
  resolve,
  type ClosedSetFoodId,
} from '../src/pipeline/resolve';

function candidate(foodId: string, score: number): Candidate {
  return { food_id: foodId, name: foodId, score };
}

describe('closed-set resolver', () => {
  it('accepts a clear single candidate', () => {
    const result = resolve('rice', [candidate('us.rice_white_cooked', 0.8)]);

    expect(result.food_id).toBe('us.rice_white_cooked');
    expect(result.confidence).toBe(0.88);
    expect(result.candidates).toEqual([candidate('us.rice_white_cooked', 0.8)]);
  });

  it('uses the top-two margin to lower confidence for a near tie', () => {
    const result = resolve('rice', [
      candidate('us.rice_white_cooked', 0.8),
      candidate('jp.rice_steamed', 0.79),
    ]);

    expect(result.food_id).toBe('us.rice_white_cooked');
    expect(result.confidence).toBe(0.488);
  });

  it('abstains below the acceptance threshold instead of returning the top candidate', () => {
    const result = resolve('unicorn casserole', [candidate('us.rice_white_cooked', 0.33)]);

    expect(result.food_id).toBe(ABSTAIN);
    expect(result.confidence).toBe(0.462);
    expect(result.candidates[0]?.food_id).toBe('us.rice_white_cooked');
  });

  it('keeps the correct low-scoring candidate only when abstention is explicitly disabled', () => {
    const result = resolve(
      'known but weak query',
      [candidate('us.rice_white_cooked', MIN_ACCEPT_SCORE - 0.01)],
      false,
    );

    expect(result.food_id).toBe('us.rice_white_cooked');
  });

  it('preserves the independent confusion cap below the acceptance threshold', () => {
    const result = resolve('baked beans', [candidate('tr.kuru_fasulye', 0.30)]);

    expect(result.food_id).toBe(ABSTAIN);
  });

  it('returns ABSTAIN for an empty candidate set', () => {
    const result = resolve('nothing in the catalogue', []);

    expect(result.food_id).toBe(ABSTAIN);
    expect(result.confidence).toBe(0.0);
    expect(result.candidates).toEqual([]);
  });

  it('does not expose arbitrary strings as a resolved food ID', () => {
    const result = resolve('rice', [candidate('us.rice_white_cooked', 0.8)]);
    const closedSetId: ClosedSetFoodId = result.food_id;

    expect(closedSetId).toBe('us.rice_white_cooked');

    // @ts-expect-error An ID not sourced from the candidate set is not representable.
    const invented: ClosedSetFoodId = 'invented.food';
    expect(invented).toBe('invented.food');
  });
});
