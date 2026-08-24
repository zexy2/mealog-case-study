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
import { ABSTAIN, type Candidate, type ResolvedItem } from '../domain/models';
/** Below this score we would rather ask than silently log a wrong food. */
export declare const MIN_ACCEPT_SCORE = 0.34;
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
/**
 * Pick the highest-ranked candidate or abstain below the absolute threshold.
 * A narrow top-two margin lowers confidence but does not invent a second rule:
 * routing decides what to do with that uncertainty downstream.
 */
export declare function resolve(query: string, candidates: readonly Candidate[], allowAbstain?: boolean): ClosedSetResolvedItem;
export {};
