import { describe, expect, it } from 'vitest';

import { makePerceivedItem } from '../src/domain/models';
import { fold, normalize, parsePortion, type LocalePack } from '../src/pipeline/normalize';

const enPack: LocalePack = {
  text_rules: {
    lowercase: true,
    strip_accents: false,
  },
};

const trPack: LocalePack = {
  text_rules: {
    lowercase: true,
    strip_accents: true,
    char_map: {
      İ: 'i',
      I: 'i',
      ı: 'i',
    },
  },
};

describe('fold', () => {
  it('folds Turkish dotted and dotless i through pack data', () => {
    expect(fold('I İ ı', trPack)).toBe('i i i');
  });

  it('removes diacritics without a locale branch in the normalizer', () => {
    expect(fold('ŞİŞ ÇÖĞÜ', trPack)).toBe('sis cogu');
  });

  it('preserves a mixed Turkish and English string after folding', () => {
    expect(fold('İKİ cups mercimek', trPack)).toBe('iki cups mercimek');
  });
});

describe('parsePortion', () => {
  it('keeps numeric, vulgar, mixed and word quantities', () => {
    expect(parsePortion('1/2 bowl', enPack)).toEqual([0.5, 'bowl']);
    expect(parsePortion('½ bowl', enPack)).toEqual([0.5, 'bowl']);
    expect(parsePortion('1 1/2 cups', enPack)).toEqual([1.5, 'cups']);
    expect(parsePortion('one and a half cups', enPack)).toEqual([1.5, 'cups']);
  });

  it('matches the Python Turkish unit token after folding', () => {
    expect(parsePortion('iki kepçe', trPack)).toEqual([2.0, 'kepce']);
    expect(parsePortion('kepçe', trPack)).toEqual([null, 'kepce']);
  });
});

describe('normalize', () => {
  it('normalizes the query and portion while retaining the observation', () => {
    const item = makePerceivedItem({
      surface_form: 'MERCİMEK',
      portion_hint: 'iki kepçe',
    });

    expect(normalize([item], trPack)).toEqual([
      {
        original: item,
        query: 'mercimek',
        quantity: 2.0,
        unit: 'kepce',
        count_origin: null,
      },
    ]);
  });

  it('skips portion parsing when rules are disabled', () => {
    const item = makePerceivedItem({ surface_form: 'İKİ', portion_hint: 'iki kepçe' });

    expect(normalize([item], trPack, false)).toEqual([
      {
        original: item,
        query: 'i\u0307ki\u0307',
        quantity: null,
        unit: null,
        count_origin: null,
      },
    ]);
  });

  it('does not parse numeric vision hints as user quantity evidence', () => {
    const item = makePerceivedItem({
      surface_form: 'simit',
      portion_hint: '1 whole',
      count_origin: 'vision',
    });

    expect(normalize([item], trPack)).toEqual([
      {
        original: item,
        query: 'simit',
        quantity: null,
        unit: null,
        count_origin: 'vision',
      },
    ]);
  });

  it('uses structured vision count without parsing portion_hint', () => {
    const item = makePerceivedItem({
      surface_form: 'simit',
      portion_hint: 'stacked',
      count: 2,
      count_origin: 'vision',
    });

    expect(normalize([item], trPack)[0]).toMatchObject({
      quantity: 2,
      unit: null,
      count_origin: 'vision',
    });
  });
});
