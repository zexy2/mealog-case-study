/**
 * In-house TF-IDF vectorisers: word 1–2 grams and character 3–5 grams.
 *
 * This file exists because `scikit-learn` does not come across the port and no
 * npm equivalent is being added. It is a faithful reimplementation of the two
 * `TfidfVectorizer` configurations `retrieval.py` used, and nothing more —
 * the scoring layer that consumes it lives in `./index.ts` and is unchanged
 * (D6).
 *
 * The Python configuration being reproduced, read from the source rather than
 * assumed, is:
 *
 *   TfidfVectorizer(analyzer="word",    ngram_range=(1, 2), binary=True,
 *                   norm=None, use_idf=True)
 *   TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), binary=True,
 *                   norm=None, use_idf=True)
 *
 * with sklearn's defaults for everything else, the ones that matter being
 * `smooth_idf=True`, `sublinear_tf=False`, `lowercase=True`,
 * `strip_accents=None` and `token_pattern=r"(?u)\b\w\w+\b"`.
 *
 * `binary=True` with `norm=None` and `use_idf=True` means a transformed row
 * holds the raw IDF of each present n-gram, once, regardless of how many times
 * it occurs. That is precisely the weight the coverage score needs, which is
 * why the Python module chose that combination.
 *
 * This module is framework-agnostic by rule: no framework import may appear
 * under `src/pipeline/`, and `scripts/check_invariants.py` fails the build if
 * one does.
 */

/** Turns a document into the list of n-grams it contributes. */
export type Analyzer = (text: string) => string[];

/**
 * sklearn's `token_pattern=r"(?u)\b\w\w+\b"`: runs of two or more Unicode word
 * characters.
 *
 * The pattern is not transliterated literally. JavaScript's `\b` is defined
 * over ASCII word characters even under the `u` flag, so `\b\w\w+\b` would cut
 * Turkish and Japanese tokens in places Python does not. Since `\w\w+` is
 * greedy and anchored by boundaries on both sides, the Python pattern selects
 * exactly the maximal runs of word characters whose length is at least two —
 * which is what this matches directly.
 */
const WORD_RUN = /[\p{L}\p{N}_]+/gu;

/** sklearn's `_white_spaces = re.compile(r"\s\s+")`. */
const REPEATED_WHITESPACE = /\s\s+/g;

/** sklearn's `preprocess`: lowercase only, since `strip_accents` is None. */
function preprocess(text: string): string {
  return text.toLowerCase();
}

function tokenize(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(WORD_RUN)) {
    if (match[0].length >= 2) {
      out.push(match[0]);
    }
  }
  return out;
}

/**
 * sklearn's `_word_ngrams` for `ngram_range=(1, 2)`: every unigram in order,
 * then every bigram joined by a single space.
 */
export function wordAnalyzer(text: string, minN = 1, maxN = 2): string[] {
  const tokens = tokenize(preprocess(text));
  if (maxN === 1) {
    return tokens;
  }

  const grams: string[] = [];
  let start = minN;
  if (minN === 1) {
    grams.push(...tokens);
    start = 2;
  }
  const limit = Math.min(maxN + 1, tokens.length + 1);
  for (let n = start; n < limit; n += 1) {
    for (let i = 0; i + n <= tokens.length; i += 1) {
      grams.push(tokens.slice(i, i + n).join(' '));
    }
  }
  return grams;
}

/**
 * sklearn's `_char_wb_ngrams` for `ngram_range=(3, 5)`.
 *
 * Each whitespace-separated word is padded with one space on each side and
 * n-grams are taken inside that padded word only, never across a word
 * boundary. The padding is what makes a prefix or suffix match distinguishable
 * from a match in the middle of a token — the property that carries inflection
 * and transliteration, which is why char n-grams outweigh word matches here.
 *
 * The trailing `if (offset === 0) break` reproduces sklearn's rule that a word
 * shorter than `n` is emitted once rather than once per remaining `n`.
 */
export function charWbAnalyzer(text: string, minN = 3, maxN = 5): string[] {
  const normalised = preprocess(text).replace(REPEATED_WHITESPACE, ' ');
  const grams: string[] = [];

  for (const rawWord of normalised.split(/\s+/)) {
    if (rawWord === '') {
      continue;
    }
    const w = ` ${rawWord} `;
    const wLen = w.length;

    for (let n = minN; n <= maxN; n += 1) {
      let offset = 0;
      grams.push(w.slice(offset, offset + n));
      while (offset + n < wLen) {
        offset += 1;
        grams.push(w.slice(offset, offset + n));
      }
      if (offset === 0) {
        break;
      }
    }
  }
  return grams;
}

/** What a transformed query contributes to the coverage denominator. */
export interface TransformedQuery {
  /** Distinct in-vocabulary n-grams of the query, with their IDF weight. */
  readonly present: ReadonlyMap<string, number>;
  /** Sum of those IDF weights — sklearn's `q.sum()`. */
  readonly sum: number;
  /** Count of distinct query n-grams the vocabulary has never seen. */
  readonly unseen: number;
}

/**
 * A fitted binary TF-IDF index over a fixed document set.
 *
 * Documents are stored as postings (n-gram to the document indices containing
 * it) rather than as a matrix. The scoring loop only ever needs, for one
 * query, the documents that share an n-gram with it, so postings do the work
 * of sklearn's `(mat > 0) @ q.T` without materialising a document-term matrix.
 */
export class TfidfVectoriser {
  readonly nDocs: number;
  readonly maxIdf: number;

  private readonly idf = new Map<string, number>();
  private readonly postings = new Map<string, number[]>();

  constructor(docs: readonly string[], private readonly analyzer: Analyzer) {
    this.nDocs = docs.length;

    docs.forEach((doc, docIndex) => {
      for (const gram of new Set(analyzer(doc))) {
        const posting = this.postings.get(gram);
        if (posting === undefined) {
          this.postings.set(gram, [docIndex]);
        } else {
          posting.push(docIndex);
        }
      }
    });

    // sklearn with smooth_idf=True: idf(t) = ln((1 + n) / (1 + df(t))) + 1.
    // The smoothing is as if one extra document contained every term, which is
    // what keeps a term present in every document at a non-zero weight.
    let maxIdf = 0;
    for (const [gram, posting] of this.postings) {
      const value = Math.log((1 + this.nDocs) / (1 + posting.length)) + 1;
      this.idf.set(gram, value);
      if (value > maxIdf) {
        maxIdf = value;
      }
    }
    this.maxIdf = maxIdf;
  }

  get vocabularySize(): number {
    return this.idf.size;
  }

  idfOf(gram: string): number | undefined {
    return this.idf.get(gram);
  }

  documentsContaining(gram: string): readonly number[] {
    return this.postings.get(gram) ?? [];
  }

  /**
   * sklearn's `transform([query])`, plus the count of n-grams it would have
   * dropped.
   *
   * `transform` silently discards out-of-vocabulary n-grams. The caller needs
   * to know how many there were, because charging them is the difference
   * between a foreign dish scoring near zero and scoring 0.55 against an
   * unrelated food.
   */
  transform(query: string): TransformedQuery {
    const present = new Map<string, number>();
    let unseen = 0;
    let sum = 0;

    for (const gram of new Set(this.analyzer(query))) {
      const weight = this.idf.get(gram);
      if (weight === undefined) {
        unseen += 1;
      } else {
        present.set(gram, weight);
        sum += weight;
      }
    }

    return { present, sum, unseen };
  }
}
