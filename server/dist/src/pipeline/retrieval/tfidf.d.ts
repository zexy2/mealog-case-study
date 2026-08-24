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
 * sklearn's `_word_ngrams` for `ngram_range=(1, 2)`: every unigram in order,
 * then every bigram joined by a single space.
 */
export declare function wordAnalyzer(text: string, minN?: number, maxN?: number): string[];
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
export declare function charWbAnalyzer(text: string, minN?: number, maxN?: number): string[];
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
export declare class TfidfVectoriser {
    private readonly analyzer;
    readonly nDocs: number;
    readonly maxIdf: number;
    private readonly idf;
    private readonly postings;
    constructor(docs: readonly string[], analyzer: Analyzer);
    get vocabularySize(): number;
    idfOf(gram: string): number | undefined;
    documentsContaining(gram: string): readonly number[];
    /**
     * sklearn's `transform([query])`, plus the count of n-grams it would have
     * dropped.
     *
     * `transform` silently discards out-of-vocabulary n-grams. The caller needs
     * to know how many there were, because charging them is the difference
     * between a foreign dish scoring near zero and scoring 0.55 against an
     * unrelated food.
     */
    transform(query: string): TransformedQuery;
}
