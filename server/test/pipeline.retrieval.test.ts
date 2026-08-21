/**
 * Retrieval port: the behaviours the Python module earned the hard way.
 *
 * The aggregate parity evidence (the 145-variant retrieval scorecard on the
 * 53-food catalogue, reproduced byte-for-byte against the Python
 * implementation) lives in the pull request. These tests pin the individual
 * properties so a later change cannot quietly undo one while the aggregate
 * still looks fine.
 *
 * Fixtures are hand-built rather than loaded from `locale_packs/`: the loader
 * is a sibling Wave 1 module and is not on `main` yet, and unit tests should
 * not depend on catalogue data that other agents are actively growing.
 * `fold` is likewise supplied here as a stand-in for the normalize module,
 * which is exactly what the dependency seam is for.
 */

import { describe, expect, it } from 'vitest';

import {
  CONFUSION_SCORE,
  MIN_SIGNAL,
  W_CHAR,
  W_WORD,
  buildIndex,
  clearIndexCache,
  createRetrieval,
  packIdentity,
  roundHalfEven,
  similarities,
  type RetrievalPack,
} from '../src/pipeline/retrieval/index';
import {
  TfidfVectoriser,
  charWbAnalyzer,
  wordAnalyzer,
} from '../src/pipeline/retrieval/tfidf';

/**
 * Stand-in for `normalize.fold` until #122 lands. Implements the same folding
 * contract the locale packs describe: character map, lowercase, accent strip,
 * whitespace collapse.
 */
function fold(text: string, pack: RetrievalPack): string {
  const rules = (pack.text_rules ?? {}) as {
    char_map?: Record<string, string>;
    lowercase?: boolean;
    strip_accents?: boolean;
  };
  let out = text;
  for (const [src, dst] of Object.entries(rules.char_map ?? {})) {
    out = out.split(src).join(dst);
  }
  if (rules.lowercase ?? true) {
    out = out.toLowerCase();
  }
  if (rules.strip_accents ?? false) {
    out = out.normalize('NFD').replace(/\p{Mn}/gu, '');
  }
  return out.replace(/\s+/g, ' ').trim();
}

/**
 * Fixtures are mutable so individual tests can vary one field; `RetrievalPack`
 * itself is read-only, and a mutable object satisfies it.
 */
interface MutablePack {
  locale: string;
  text_rules: Record<string, unknown>;
  foods: Record<string, { name: string }>;
  aliases: Record<string, string[]>;
  negative_aliases: Record<string, string[]>;
  [extra: string]: unknown;
}

const TR_RULES = {
  lowercase: true,
  strip_accents: true,
  char_map: { '\u0130': 'i', I: 'i', '\u0131': 'i' },
};

/** Modelled on `locale_packs/tr`, including its real negative aliases. */
function trPack(): MutablePack {
  return {
    locale: 'tr',
    text_rules: TR_RULES,
    foods: {
      'tr.pilav': { name: 'Pilav' },
      'tr.kuru_fasulye': { name: 'Kuru Fasulye' },
      'tr.ekmek_beyaz': { name: 'Beyaz Ekmek' },
      'tr.mercimek_corbasi': { name: 'Mercimek Çorbası' },
    },
    aliases: {
      'tr.pilav': ['pilav', 'pilavi', 'pirinc', 'pirinc pilavi', 'sade pirinc pilavi'],
      'tr.kuru_fasulye': ['kuru fasulye', 'fasulye', 'etli kuru fasulye'],
      'tr.ekmek_beyaz': ['beyaz ekmek', 'ekmek'],
      'tr.mercimek_corbasi': ['mercimek', 'mercimek corbasi'],
    },
    negative_aliases: {
      // 'etli ekmek' is a documented trap for two different foods. Both must
      // be capped, or the query slides from the first to the second.
      'tr.kuru_fasulye': ['baked beans', 'baked bean', 'etli ekmek'],
      'tr.ekmek_beyaz': ['etli ekmek'],
    },
  };
}

/** Minimal English pack for the token-boundary case. */
function enPack(): MutablePack {
  return {
    locale: 'en_US',
    text_rules: { lowercase: true },
    foods: {
      'us.rice_white_cooked': { name: 'White rice, cooked' },
      'us.cauliflower_riced': { name: 'Riced cauliflower' },
    },
    aliases: {
      'us.rice_white_cooked': ['rice', 'white rice', 'steamed rice'],
      'us.cauliflower_riced': ['riced cauliflower'],
    },
    negative_aliases: {},
  };
}

function retrieval() {
  clearIndexCache();
  return createRetrieval({ fold });
}

// ---------------------------------------------------------------- analyzers

describe('word analyzer', () => {
  it('emits unigrams then bigrams, matching sklearn ngram_range=(1, 2)', () => {
    expect(wordAnalyzer('riced cauliflower')).toEqual([
      'riced',
      'cauliflower',
      'riced cauliflower',
    ]);
  });

  it('drops single-character tokens, matching token_pattern \\b\\w\\w+\\b', () => {
    expect(wordAnalyzer('a rice')).toEqual(['rice']);
    expect(wordAnalyzer('ab')).toEqual(['ab']);
    expect(wordAnalyzer('   ')).toEqual([]);
  });

  it('keeps non-ASCII tokens whole', () => {
    // JavaScript's \b is ASCII-only, so a literal transliteration of the
    // Python pattern would split these. They must survive as single tokens.
    expect(wordAnalyzer('çorbası')).toEqual(['çorbası']);
    expect(wordAnalyzer('餃子')).toEqual(['餃子']);
  });
});

describe('char_wb analyzer', () => {
  it('pads each word and stays inside it', () => {
    expect(charWbAnalyzer('rice')).toEqual([
      ' ri', 'ric', 'ice', 'ce ',
      ' ric', 'rice', 'ice ',
      ' rice', 'rice ',
    ]);
  });

  it('emits a word shorter than n exactly once', () => {
    expect(charWbAnalyzer('a')).toEqual([' a ']);
    expect(charWbAnalyzer('ab')).toEqual([' ab', 'ab ', ' ab ']);
  });

  it('never produces an n-gram spanning two words', () => {
    const grams = charWbAnalyzer('kuru fasulye');
    expect(grams.some((g) => g.includes('u f'))).toBe(false);
    expect(grams.every((g) => g.trim().split(/\s+/).length === 1)).toBe(true);
  });
});

describe('IDF', () => {
  it('uses sklearn smooth_idf: ln((1 + n) / (1 + df)) + 1', () => {
    const docs = ['alpha beta', 'alpha gamma', 'alpha delta'];
    const v = new TfidfVectoriser(docs, (t) => wordAnalyzer(t, 1, 1));
    // 'alpha' is in all three documents, 'beta' in one.
    expect(v.idfOf('alpha')).toBeCloseTo(Math.log(4 / 4) + 1, 15);
    expect(v.idfOf('beta')).toBeCloseTo(Math.log(4 / 2) + 1, 15);
    expect(v.maxIdf).toBeCloseTo(Math.log(4 / 2) + 1, 15);
  });

  it('reports out-of-vocabulary n-grams instead of dropping them silently', () => {
    const v = new TfidfVectoriser(['alpha beta'], (t) => wordAnalyzer(t, 1, 1));
    const q = v.transform('alpha zeta');
    expect([...q.present.keys()]).toEqual(['alpha']);
    expect(q.unseen).toBe(1);
  });
});

// --------------------------------------------- earned behaviour 1: unseen IDF

describe('unseen n-grams are charged at maximum IDF in the denominator', () => {
  it('scores an entirely foreign dish below MIN_SIGNAL', () => {
    const cands = retrieval().search('pizza margherita', trPack());
    expect(cands).toEqual([]);
  });

  it('is what keeps that score low — dropping unseen grams reintroduces the bug', () => {
    const pack = trPack();
    const index = buildIndex(pack, packIdentity(pack), fold);
    const query = 'pizza margherita';

    // Reproduce both denominators directly, so the regression is pinned to the
    // mechanism rather than to one query's final number.
    let shipped = 0;
    let ifUnseenWereDropped = 0;
    for (const [vec, weight] of [
      [index.word, W_WORD],
      [index.char, W_CHAR],
    ] as const) {
      const q = vec.transform(query);
      const covered = new Array<number>(index.foodIds.length).fill(0);
      for (const [gram, idf] of q.present) {
        for (const d of vec.documentsContaining(gram)) {
          covered[d] += idf;
        }
      }
      const best = Math.max(...covered);
      shipped += (best / (q.sum + q.unseen * vec.maxIdf)) * weight;
      if (q.sum > 0) {
        ifUnseenWereDropped += (best / q.sum) * weight;
      }
    }

    expect(shipped).toBeLessThan(MIN_SIGNAL);
    // This is the sklearn transform() behaviour the Python module had to
    // correct: "pizza margherita" scored 0.55 against a Turkish rice dish.
    expect(ifUnseenWereDropped).toBeGreaterThan(0.5);
  });

  it('charges every unseen n-gram, so the score falls as the query gets more foreign', () => {
    const pack = trPack();
    const index = buildIndex(pack, packIdentity(pack), fold);
    const near = Math.max(...similarities(index, 'pilav'));
    const foreign = Math.max(...similarities(index, 'pizza margherita'));
    expect(near).toBeGreaterThan(foreign);
    expect(foreign).toBeLessThan(MIN_SIGNAL);
  });
});

// ------------------------------------ earned behaviour 2: negative_alias caps

describe('negative_alias eliminates every food carrying the matched alias', () => {
  it('surfaces the documented trap and caps it below the accept threshold', () => {
    const cands = retrieval().search('baked beans', trPack());
    const kuru = cands.find((c) => c.food_id === 'tr.kuru_fasulye');
    expect(kuru, 'confusable food was not surfaced').toBeDefined();
    expect(kuru?.score).toBe(CONFUSION_SCORE);
  });

  it('caps every food the alias maps to, so the query cannot slide to a second neighbour', () => {
    // 'etli ekmek' is a documented trap for both kuru fasulye and beyaz ekmek.
    // Capping only the first would leave the second free to clear the
    // resolver threshold — the exact failure that follows catalogue growth.
    const cands = retrieval().search('etli ekmek', trPack());
    const capped = cands.filter((c) => c.score === CONFUSION_SCORE).map((c) => c.food_id);
    expect(capped.sort()).toEqual(['tr.ekmek_beyaz', 'tr.kuru_fasulye']);
    for (const c of cands) {
      expect(c.score).toBeLessThanOrEqual(CONFUSION_SCORE);
    }
  });

  it('keeps the confusion cap below the resolver accept threshold', () => {
    // resolve.MIN_ACCEPT_SCORE is 0.34 in the Python source. It is asserted
    // as a literal rather than imported so the two thresholds stay
    // independently readable, matching the Python test. When resolve is
    // ported (#123), this becomes a direct cross-module assertion.
    const MIN_ACCEPT_SCORE = 0.34;
    expect(CONFUSION_SCORE).toBeLessThan(MIN_ACCEPT_SCORE);
  });

  it('does not let a generic negative alias override an exact positive hit', () => {
    // An exact surface hit is stronger evidence than a generic confusion note.
    const pack = trPack();
    pack.negative_aliases['tr.pilav'] = ['pilav'];
    const cands = createRetrieval({ fold }).search('pilav', pack);
    expect(cands[0]?.food_id).toBe('tr.pilav');
    expect(cands[0]?.score).toBe(1.0);
  });
});

// ------------------------------- earned behaviour 3: token-boundary matching

describe('sub-phrase matching respects token boundaries', () => {
  it('does not match a negative alias inside a longer token', () => {
    const pack = enPack();
    pack.negative_aliases['us.rice_white_cooked'] = ['rice'];
    // "rice" occurs inside "riced", but not as a whole token.
    const cands = createRetrieval({ fold }).search('riced cauliflower', pack);
    const white = cands.find((c) => c.food_id === 'us.rice_white_cooked');
    expect(white?.score).not.toBe(CONFUSION_SCORE);
    expect(cands[0]?.food_id).toBe('us.cauliflower_riced');
  });

  it('does match a negative alias that occupies whole tokens mid-query', () => {
    const cands = retrieval().search('bir tabak baked beans', trPack());
    expect(cands.find((c) => c.food_id === 'tr.kuru_fasulye')?.score).toBe(CONFUSION_SCORE);
  });
});

// ------------------------------------------------------------ search contract

describe('search', () => {
  it('returns an exact surface hit at 1.0', () => {
    const cands = retrieval().search('kuru fasulye', trPack());
    expect(cands[0]?.food_id).toBe('tr.kuru_fasulye');
    expect(cands[0]?.score).toBe(1.0);
  });

  it('reaches the same canonical food from inflected forms', () => {
    const r = retrieval();
    for (const q of ['pilav', 'pilavi', 'PİLAV', 'pirinc pilavi']) {
      expect(r.search(q, trPack())[0]?.food_id, q).toBe('tr.pilav');
    }
  });

  it('returns no candidates for an empty or whitespace-only query', () => {
    const r = retrieval();
    expect(r.search('', trPack())).toEqual([]);
    expect(r.search('   ', trPack())).toEqual([]);
  });

  it('returns scores ordered descending and inside [0, 1]', () => {
    const cands = retrieval().search('mercimek corbasi', trPack());
    expect(cands.length).toBeGreaterThan(0);
    for (const c of cands) {
      expect(c.score).toBeGreaterThanOrEqual(0);
      expect(c.score).toBeLessThanOrEqual(1);
    }
    expect(cands.map((c) => c.score)).toEqual([...cands.map((c) => c.score)].sort((a, b) => b - a));
  });

  it('honours k', () => {
    expect(retrieval().search('pilav', trPack(), 1).length).toBeLessThanOrEqual(1);
  });

  it('resolves the same surface form differently per pack', () => {
    const r = retrieval();
    expect(r.search('rice', enPack())[0]?.food_id).toBe('us.rice_white_cooked');
    expect(r.search('pilav', trPack())[0]?.food_id).toBe('tr.pilav');
  });

  it('breaks a genuine tie deterministically, by food_id', () => {
    // Giving the cauliflower entry the alias "cauliflower rice" puts the whole
    // token "rice" into its document too, so both foods cover the query
    // completely and both score 1.0. That is real ambiguity, which D6 hands to
    // the resolver's margin rule rather than resolving silently — but the
    // ordering still has to be stable, so it falls to food_id ascending.
    // Verified against the Python implementation on the same fixture.
    const pack = enPack();
    pack.aliases['us.cauliflower_riced'] = ['riced cauliflower', 'cauliflower rice'];
    const cands = createRetrieval({ fold }).search('rice', pack);
    expect(cands.map((c) => [c.food_id, c.score])).toEqual([
      ['us.cauliflower_riced', 1.0],
      ['us.rice_white_cooked', 1.0],
    ]);
  });
});

// ------------------------------------------------------------- index caching

describe('index cache', () => {
  it('is keyed on pack content, so changed data gets a fresh index', () => {
    const a = trPack();
    const b = trPack();
    expect(packIdentity(a)).toBe(packIdentity(b));

    b.foods['tr.injected'] = { name: 'Injected' };
    b.aliases['tr.injected'] = ['injected food'];
    expect(packIdentity(b)).not.toBe(packIdentity(a));

    const r = createRetrieval({ fold });
    expect(r.search('injected food', a)).toEqual([]);
    expect(r.search('injected food', b)[0]?.food_id).toBe('tr.injected');
  });

  it('does not key on the locale name, which is not an identity', () => {
    const a = trPack();
    const b = trPack();
    b.foods['tr.pilav'] = { name: 'Something else entirely' };
    expect(a.locale).toBe(b.locale);
    expect(packIdentity(a)).not.toBe(packIdentity(b));
  });
});

// -------------------------------------------------------------- score rounding

describe('score rounding matches Python', () => {
  it('rounds half to even on an exact tie, as Python round() does', () => {
    // A naive port using Math.round(v * 1000) / 1000 returns 0.313 here.
    expect(roundHalfEven(0.3125, 3)).toBe(0.312);
    expect(roundHalfEven(0.0625, 3)).toBe(0.062);
    expect(roundHalfEven(0.5625, 3)).toBe(0.562);
    expect(roundHalfEven(0.4375, 3)).toBe(0.438);
  });

  it('rounds on the true binary value, not the printed decimal', () => {
    // 0.8625 as a double is 0.86250000000000004..., which is above the tie.
    expect(roundHalfEven(0.8625, 3)).toBe(0.863);
    // 0.1235 as a double is 0.12349999999999999..., which is below it.
    expect(roundHalfEven(0.1235, 3)).toBe(0.123);
  });

  it('carries correctly', () => {
    expect(roundHalfEven(0.9996, 3)).toBe(1);
    expect(roundHalfEven(0, 3)).toBe(0);
  });
});
