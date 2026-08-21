/**
 * Closed-set resolution.
 *
 * Retrieval puts the only possible food IDs on the table. This stage may
 * return one of those IDs or ABSTAIN; it never invents a catalogue entry.
 * The branded return type makes that boundary visible to TypeScript callers,
 * while the runtime implementation mirrors `pipeline/resolve.py`.
 *
 * This module is framework-agnostic by rule: no NestJS import may appear under
 * `src/pipeline/`, and `scripts/check_invariants.py` fails the build if one
 * does.
 */

import {
  ABSTAIN,
  makeResolvedItem,
  type Candidate,
  type ResolvedItem,
} from '../domain/models';

/** Below this score we would rather ask than silently log a wrong food. */
export const MIN_ACCEPT_SCORE = 0.34;

declare const candidateFoodIdBrand: unique symbol;

/** A food ID that came from the candidate set, rather than caller text. */
export type CandidateFoodId = string & {
  readonly [candidateFoodIdBrand]: 'candidate-food-id';
};

/** The resolver's only legal outputs: a candidate ID or the explicit sentinel. */
export type ClosedSetFoodId = typeof ABSTAIN | CandidateFoodId;

/** ResolvedItem narrowed so an arbitrary food ID cannot be manufactured. */
export type ClosedSetResolvedItem = Omit<ResolvedItem, 'food_id'> & {
  food_id: ClosedSetFoodId;
};

function asCandidateFoodId(foodId: Candidate['food_id']): CandidateFoodId {
  // The value is selected directly from a Candidate below; this is the single
  // runtime boundary where the structural brand is established.
  return foodId as CandidateFoodId;
}

/** Python's round(value, 3) uses ties-to-even; preserve that at the port seam. */
function roundToThree(value: number): number {
  const factor = 1000;
  const scaled = value * factor;
  const lower = Math.floor(scaled);
  const fraction = scaled - lower;
  const epsilon = Number.EPSILON * Math.max(1, Math.abs(scaled)) * 8;

  if (Math.abs(fraction - 0.5) <= epsilon) {
    return (lower % 2 === 0 ? lower : lower + 1) / factor;
  }
  return Math.round(scaled) / factor;
}

function makeResolution(
  query: string,
  candidates: readonly Candidate[],
  foodId: ClosedSetFoodId,
  confidence: number,
): ClosedSetResolvedItem {
  return {
    ...makeResolvedItem({
      query,
      food_id: foodId,
      candidates: [...candidates],
      confidence,
    }),
    food_id: foodId,
  };
}

/**
 * Pick the highest-ranked candidate or abstain below the absolute threshold.
 * A narrow top-two margin lowers confidence but does not invent a second rule:
 * routing decides what to do with that uncertainty downstream.
 */
export function resolve(
  query: string,
  candidates: readonly Candidate[],
  allowAbstain = true,
): ClosedSetResolvedItem {
  if (candidates.length === 0) {
    return makeResolution(query, [], ABSTAIN, 0.0);
  }

  const best = candidates[0];
  const runnerUp = candidates.length > 1 ? candidates[1].score : 0.0;
  // Margin matters as much as absolute score: two equally plausible matches
  // are a question for the user, not a coin flip.
  const margin = best.score - runnerUp;
  const confidence = roundToThree(
    Math.min(1.0, 0.6 * best.score + 0.4 * Math.min(margin * 2, 1.0)),
  );

  const foodId: ClosedSetFoodId =
    allowAbstain && best.score < MIN_ACCEPT_SCORE
      ? ABSTAIN
      : asCandidateFoodId(best.food_id);
  return makeResolution(query, candidates, foodId, confidence);
}
