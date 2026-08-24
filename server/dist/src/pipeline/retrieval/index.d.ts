/**
 * Candidate generation over the canonical catalogue.
 *
 * Two signals over the same document set, blended:
 *
 * * **word-level n-grams** — carry whole-token meaning ("grilled chicken").
 * * **character 3–5-grams** — carry sub-token similarity, which is what
 *   actually absorbs inflection (`pilav` / `pilavi`), transliteration and
 *   typos. Turkish and Japanese make those the common case, not the edge case.
 *
 * Both are scored as IDF-weighted *asymmetric coverage* rather than cosine
 * similarity; `similarities` explains why that distinction mattered in
 * practice.
 *
 * Ported from `server/src/mealog/pipeline/retrieval.py`. The scoring layer is
 * a port, not a redesign: D6 is settled and records why BM25, Reciprocal Rank
 * Fusion and cosine were each rejected. The one thing that is genuinely new
 * here is the vectoriser in `./tfidf.ts`, because `scikit-learn` does not come
 * across and no npm replacement is being added.
 *
 * No locale is named anywhere in this module (decision D2, enforced in CI),
 * and no framework is imported (D12, also enforced in CI).
 */
import type { Candidate } from '../../domain/models';
import type { LocalePack } from '../../locales/loader';
import { TfidfVectoriser } from './tfidf';
/**
 * Char n-grams are weighted above word matches because the failure this
 * replaces was an inflection miss, not a semantic one.
 */
export declare const W_CHAR = 0.55;
export declare const W_WORD = 0.45;
/**
 * Score handed to a known-confusion hit. It must stay *below*
 * `resolve.MIN_ACCEPT_SCORE` so the resolver abstains and the gate asks the
 * user, rather than silently accepting a food we already know is a trap.
 * The retrieval test asserts that relationship instead of importing it, so the
 * two thresholds stay independently readable.
 */
export declare const CONFUSION_SCORE = 0.3;
/** Below this share of the query accounted for, a match is noise. */
export declare const MIN_SIGNAL = 0.15;
/** Per-pack search structures. Built once per pack content identity. */
export interface RetrievalIndex {
    readonly foodIds: string[];
    /** folded surface form -> food_id */
    readonly exact: Map<string, string>;
    /** folded form -> all food_ids it is confused with */
    readonly negative: Map<string, string[]>;
    readonly word: TfidfVectoriser;
    readonly char: TfidfVectoriser;
}
/**
 * Return a stable identity for every value that can affect retrieval.
 *
 * Locale names are not identities: tests and pack builders can hand us a
 * changed pack with the same locale. Hashing the complete pack keeps the cache
 * fast for repeated calls while ensuring changed data gets a fresh index in
 * the same process. Content, never mtime — mtime is wrong in CI, where every
 * file is checked out at the same moment.
 */
export declare function packIdentity(pack: LocalePack): string;
/**
 * Python's `round(x, 3)`: round-half-to-even on the true value of the double.
 *
 * JavaScript has no equivalent. `Math.round` is half-up and `toFixed` is
 * half-away-from-zero, so both disagree with Python on an exact tie such as
 * 0.3125. Rounding is applied to every score before ranking, so a disagreement
 * here would be a real behaviour difference rather than a display detail.
 *
 * `toFixed` is correctly rounded from the exact binary value, so asking for
 * well beyond the ~17 significant digits a double carries is enough to tell an
 * exact tie from a value that merely looks like one.
 */
export declare function roundHalfEven(value: number, digits: number): number;
export declare function buildIndex(pack: LocalePack, identity: string): RetrievalIndex;
/**
 * IDF-weighted asymmetric coverage: *how much of what the user said is
 * accounted for by this food's surface forms*, weighted by how distinctive
 * each piece is.
 *
 * Cosine was the obvious choice and the wrong one. It is symmetric, so a short
 * query against a document holding a canonical name plus several aliases is
 * penalised for everything the document contains that the query did not say —
 * `pilav` scored 0.28 against `sade pirinc pilavi` purely because the document
 * was longer. Ranking survived that; the absolute score did not, and the
 * resolver thresholds on the absolute score.
 *
 * Coverage has the semantics we actually want: an unambiguous partial name
 * scores high, and a query the catalogue cannot account for scores low. When a
 * short query covers several foods equally, they all score high and the
 * resolver's margin rule turns that into a question — which is correct, that
 * is genuine ambiguity rather than low similarity.
 */
export declare function similarities(index: RetrievalIndex, query: string): number[];
/**
 * Folding is owned by the normalize module (#122) and imported directly now
 * that both Wave 1 modules are on main. The loader's LocalePack is the single
 * pack type shared by the pipeline.
 */
export interface Retrieval {
    /**
     * Return up to `k` canonical candidates for a query string.
     *
     * An empty list is a valid, meaningful answer: it makes the resolver
     * abstain, which is the correct behaviour for food we do not carry.
     */
    search(query: string, pack: LocalePack, k?: number): Candidate[];
}
export declare function createRetrieval(): Retrieval;
/** Drop cached indexes. Tests only; the cache is otherwise process-lifetime. */
export declare function clearIndexCache(): void;
