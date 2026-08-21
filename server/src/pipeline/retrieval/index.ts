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

import { createHash } from 'node:crypto';

import type { Candidate } from '../../domain/models';
import { TfidfVectoriser, charWbAnalyzer, wordAnalyzer } from './tfidf';

/**
 * Char n-grams are weighted above word matches because the failure this
 * replaces was an inflection miss, not a semantic one.
 */
export const W_CHAR = 0.55;
export const W_WORD = 0.45;

/**
 * Score handed to a known-confusion hit. It must stay *below*
 * `resolve.MIN_ACCEPT_SCORE` so the resolver abstains and the gate asks the
 * user, rather than silently accepting a food we already know is a trap.
 * The retrieval test asserts that relationship instead of importing it, so the
 * two thresholds stay independently readable.
 */
export const CONFUSION_SCORE = 0.3;

/** Below this share of the query accounted for, a match is noise. */
export const MIN_SIGNAL = 0.15;

/** Locale-aware folding. Owned by the normalize module, injected here. */
export type FoldFn = (text: string, pack: RetrievalPack) => string;

/** The single field retrieval reads off a catalogue entry. */
export interface RetrievalFood {
  readonly name: string;
}

/**
 * The shape of a locale pack, as retrieval sees it.
 *
 * Declared structurally rather than imported so this module compiles and is
 * testable on its own while the loader is ported in parallel. The real
 * `LocalePack` satisfies it without modification, and the field names are the
 * Python ones deliberately — a rename would surface as a diff at the parity
 * gate.
 */
export interface RetrievalPack {
  readonly locale: string;
  readonly foods: Readonly<Record<string, RetrievalFood>>;
  readonly aliases: Readonly<Record<string, readonly string[]>>;
  readonly negative_aliases: Readonly<Record<string, readonly string[]>>;
  readonly [extra: string]: unknown;
}

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

const INDEX_CACHE = new Map<string, RetrievalIndex>();

/** Deterministic JSON with object keys in sorted order, for hashing. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  const body = Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',');
  return `{${body}}`;
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
export function packIdentity(pack: RetrievalPack): string {
  return createHash('sha256').update(stableStringify(pack), 'utf8').digest('hex');
}

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
export function roundHalfEven(value: number, digits: number): number {
  if (!Number.isFinite(value)) {
    return value;
  }
  const negative = value < 0;
  const text = Math.abs(value).toFixed(digits + 30);
  const dot = text.indexOf('.');
  const intPart = text.slice(0, dot);
  const frac = text.slice(dot + 1);
  const keep = frac.slice(0, digits);
  const rest = frac.slice(digits);

  const leading = rest.charCodeAt(0) - 48;
  let roundUp: boolean;
  if (leading > 5) {
    roundUp = true;
  } else if (leading < 5) {
    roundUp = false;
  } else if (/[1-9]/.test(rest.slice(1))) {
    roundUp = true;
  } else {
    // Exact tie: round to the even neighbour, as Python does.
    const lastKept = (keep === '' ? intPart : keep).slice(-1);
    roundUp = (lastKept.charCodeAt(0) - 48) % 2 === 1;
  }

  let scaled = `${intPart}${keep}`;
  if (roundUp) {
    scaled = (BigInt(scaled) + 1n).toString().padStart(scaled.length, '0');
  }
  const cut = scaled.length - digits;
  const result = digits === 0 ? Number(scaled) : Number(`${scaled.slice(0, cut)}.${scaled.slice(cut)}`);
  return negative ? -result : result;
}

export function buildIndex(pack: RetrievalPack, identity: string, fold: FoldFn): RetrievalIndex {
  const cached = INDEX_CACHE.get(identity);
  if (cached !== undefined) {
    return cached;
  }

  const foodIds = Object.keys(pack.foods);

  // One document per food: canonical name plus every alias. Aliases are part
  // of the document rather than a separate lookup so a partial alias match
  // still contributes signal instead of being all-or-nothing.
  const docs: string[] = [];
  const exact = new Map<string, string>();
  const negative = new Map<string, string[]>();

  for (const foodId of foodIds) {
    const surfaces = [pack.foods[foodId].name, ...(pack.aliases[foodId] ?? [])];
    const folded = surfaces.map((surface) => fold(surface, pack));
    docs.push(folded.join(' '));

    for (const form of folded) {
      if (!exact.has(form)) {
        exact.set(form, foodId);
      }
    }
    for (const form of pack.negative_aliases[foodId] ?? []) {
      const key = fold(form, pack);
      const targets = negative.get(key);
      if (targets === undefined) {
        negative.set(key, [foodId]);
      } else if (!targets.includes(foodId)) {
        targets.push(foodId);
      }
    }
  }

  const index: RetrievalIndex = {
    foodIds,
    exact,
    negative,
    word: new TfidfVectoriser(docs, (text) => wordAnalyzer(text)),
    char: new TfidfVectoriser(docs, (text) => charWbAnalyzer(text)),
  };
  INDEX_CACHE.set(identity, index);
  return index;
}

/**
 * Return all confusion targets whose negative alias occupies whole tokens.
 *
 * A larger catalogue can expose several plausible neighbours for one surface
 * form. Cap every documented target, or another candidate can still clear the
 * resolver threshold after the first target is capped.
 *
 * Matching is on whole tokens, never on a substring: `rice` must not match
 * inside `riced cauliflower`.
 */
function negativeMatches(index: RetrievalIndex, query: string): string[] {
  const queryTokens = query.split(' ');
  const matches: string[] = [];

  for (const [alias, foodIds] of index.negative) {
    const aliasTokens = alias.split(' ');
    const width = aliasTokens.length;
    if (width === 0 || alias === '') {
      continue;
    }
    let hit = false;
    for (let i = 0; i + width <= queryTokens.length; i += 1) {
      let same = true;
      for (let j = 0; j < width; j += 1) {
        if (queryTokens[i + j] !== aliasTokens[j]) {
          same = false;
          break;
        }
      }
      if (same) {
        hit = true;
        break;
      }
    }
    if (hit) {
      for (const foodId of foodIds) {
        if (!matches.includes(foodId)) {
          matches.push(foodId);
        }
      }
    }
  }
  return matches;
}

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
export function similarities(index: RetrievalIndex, query: string): number[] {
  const total = new Array<number>(index.foodIds.length).fill(0);

  // Word first, then char: the Python implementation sums the two signals in
  // this order and floating-point addition is not associative.
  for (const [vectoriser, weight] of [
    [index.word, W_WORD],
    [index.char, W_CHAR],
  ] as const) {
    const q = vectoriser.transform(query);

    // `transform` silently drops n-grams the catalogue has never seen, so the
    // denominator must add them back. Without this, coverage is computed only
    // over the parts of the query the catalogue already recognises and an
    // entirely foreign dish can score 1.0 — "pizza margherita" matched a
    // Turkish rice dish at 0.55 before this correction, because every n-gram
    // that made it *pizza* had been discarded. Unseen n-grams are maximally
    // distinctive, so they are charged at the highest IDF in the index.
    const denominator = q.sum + q.unseen * vectoriser.maxIdf;
    if (denominator === 0) {
      continue;
    }

    const covered = new Array<number>(index.foodIds.length).fill(0);
    for (const [gram, idf] of q.present) {
      for (const docIndex of vectoriser.documentsContaining(gram)) {
        covered[docIndex] += idf;
      }
    }
    for (let i = 0; i < total.length; i += 1) {
      total[i] += (covered[i] / denominator) * weight;
    }
  }

  return total;
}

/**
 * Folding is owned by the normalize module (#122) and injected here rather
 * than imported, so retrieval stays independently testable while the two
 * modules are ported in parallel. `createRetrieval` is the only way to reach
 * `search`, so a caller cannot reach retrieval without supplying one.
 */
export interface RetrievalDeps {
  readonly fold: FoldFn;
}

export interface Retrieval {
  /**
   * Return up to `k` canonical candidates for a query string.
   *
   * An empty list is a valid, meaningful answer: it makes the resolver
   * abstain, which is the correct behaviour for food we do not carry.
   */
  search(query: string, pack: RetrievalPack, k?: number): Candidate[];
}

export function createRetrieval(deps: RetrievalDeps): Retrieval {
  return {
    search(rawQuery: string, pack: RetrievalPack, k = 5): Candidate[] {
      const query = deps.fold(rawQuery, pack);
      if (!query) {
        return [];
      }

      const index = buildIndex(pack, packIdentity(pack), deps.fold);
      const scores = new Map<string, number>();

      // 1. Exact surface hit. Unambiguous, so it outranks everything fuzzy.
      const exactHit = index.exact.get(query);
      if (exactHit !== undefined) {
        scores.set(exactHit, 1.0);
      }

      // 2. Blended fuzzy similarity.
      const sims = similarities(index, query);
      index.foodIds.forEach((foodId, i) => {
        if (sims[i] >= MIN_SIGNAL) {
          const rounded = roundHalfEven(sims[i], 3);
          scores.set(foodId, Math.max(scores.get(foodId) ?? 0, rounded));
        }
      });

      // 3. Known confusion. Surface every food this query is a documented trap
      //    for, capped low so the user is asked rather than silently given the
      //    wrong regional match. Without this the trap returns nothing and we
      //    abstain for the wrong reason — right outcome, no understanding.
      //    Multiple caps matter when a larger catalogue exposes more than one
      //    plausible neighbour.
      for (const confusedWith of negativeMatches(index, query)) {
        // A generic negative alias may be a token-bounded subphrase of a more
        // specific positive alias ("yogurt" inside "yogurt icecegi"). Preserve
        // the exact positive surface hit; it is stronger evidence than the
        // generic confusion note.
        if (confusedWith === exactHit) {
          continue;
        }
        scores.set(confusedWith, CONFUSION_SCORE);
      }

      return [...scores.entries()]
        .sort((a, b) => (b[1] - a[1]) || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
        .slice(0, k)
        .map(([foodId, score]) => ({
          food_id: foodId,
          name: pack.foods[foodId].name,
          score: roundHalfEven(score, 3),
        }));
    },
  };
}

/** Drop cached indexes. Tests only; the cache is otherwise process-lifetime. */
export function clearIndexCache(): void {
  INDEX_CACHE.clear();
}
