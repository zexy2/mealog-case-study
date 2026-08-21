import { resolve as resolvePath } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  ABSTAIN,
  makeMealLog,
  makeNutrients,
  makePerceivedItem,
  type PerceivedItem,
} from '../src/domain/models';
import { load } from '../src/locales/loader';
import { VisionInput, type VisionPort } from '../src/pipeline/ports';
import { CONFIGS, run } from '../src/pipeline/runner';

const PACK_ROOT = resolvePath(__dirname, '../../locale_packs');

interface StubVision extends VisionPort {
  calls: VisionInput[];
}

function visionStub(items: PerceivedItem[], order: string[] = []): StubVision {
  return {
    name: 'handwritten-stub',
    calls: [],
    perceive(input) {
      order.push('perception');
      this.calls.push(input);
      return items;
    },
  };
}

describe('pipeline runner', () => {
  it('runs one item end to end through a handwritten VisionPort stub', async () => {
    const vision = visionStub([
      makePerceivedItem({
        surface_form: 'scrambled eggs',
        confidence: 0.95,
      }),
    ]);

    const result = await run(
      vision,
      new VisionInput({ text: 'meal text' }),
      'en_US',
      CONFIGS.V3,
      'runner-single',
    );

    expect(vision.calls).toHaveLength(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      food_id: 'us.eggs_scrambled',
      grams: 100,
      nutrients: { kcal: 149 },
    });
    expect(result.totals.kcal).toBe(149);
    expect(result.action).toBe('auto_accept');
  });

  it('keeps a resolver abstention through the end of the meal', async () => {
    const vision = visionStub([
      makePerceivedItem({ surface_form: 'scrambled eggs', confidence: 0.95 }),
      makePerceivedItem({ surface_form: 'unicorn casserole', confidence: 0.95 }),
    ]);

    const result = await run(
      vision,
      new VisionInput({ text: 'meal text' }),
      'en_US',
      CONFIGS.V3,
      'runner-abstain',
    );

    expect(result.items).toHaveLength(2);
    expect(result.items[1]).toMatchObject({
      query: 'unicorn casserole',
      food_id: ABSTAIN,
      grams: 0,
      grams_p10: 0,
      grams_p90: 0,
      nutrients: { kcal: 0, protein_g: 0, carb_g: 0, fat_g: 0 },
    });
    expect(result.totals.kcal).toBe(149);
    expect(result.action).toBe('ask');
    expect(result.question).toContain('unicorn casserole');
  });

  it('routes an empty vision response to ask without inventing an item', async () => {
    const vision = visionStub([]);

    const result = await run(
      vision,
      'fixture-empty',
      'en_US',
      CONFIGS.V3,
      'runner-empty',
    );

    expect(result.items).toEqual([]);
    expect(result.totals.kcal).toBe(0);
    expect(result.action).toBe('ask');
    expect(result.question).toBe('I could not read this meal. What did you eat?');
  });

  it('executes perception before the grounded stages', async () => {
    const order: string[] = [];
    const vision = visionStub([
      makePerceivedItem({ surface_form: 'scrambled eggs', confidence: 0.95 }),
    ], order);

    const result = await run(
      vision,
      new VisionInput({ text: 'meal text' }),
      'en_US',
      CONFIGS.V3,
      'runner-order',
    );

    expect(order).toEqual(['perception']);
    expect(result.items[0]?.food_id).toBe('us.eggs_scrambled');
    expect(result.action).toBe('auto_accept');
  });

  it('rejects a separate text argument when input is already a VisionInput', async () => {
    const vision = visionStub([]);

    await expect(run(
      vision,
      new VisionInput({ text: 'meal text' }),
      'en_US',
      CONFIGS.V3,
      'runner-text',
      'duplicate text',
    )).rejects.toThrow('text must be part of VisionInput');
  });

  it('passes the string fixture compatibility path to VisionPort', async () => {
    const vision = visionStub([]);

    await run(vision, 'fixture-id', 'en_US', CONFIGS.V3, 'runner-fixture');

    expect(vision.calls[0]).toMatchObject({
      sampleId: 'fixture-id',
      text: null,
    });
  });

  it('asserts the complete grounded stage order explicitly', async () => {
    vi.resetModules();
    const events: string[] = [];

    vi.doMock('../src/locales/loader', () => ({
      load: vi.fn(() => {
        events.push('load');
        return {
          locale: 'test',
          text_rules: {},
          foods: {
            'test.food': {
              food_id: 'test.food',
              name: 'Test food',
              per_100g: makeNutrients({ kcal: 100 }),
            },
          },
          aliases: {},
          negative_aliases: {},
          units: {},
        };
      }),
    }));
    vi.doMock('../src/pipeline/normalize', () => ({
      fold: vi.fn((text: string) => text),
      normalize: vi.fn((items: PerceivedItem[]) => {
        events.push('normalize');
        return [{ original: items[0], query: 'test food', quantity: null, unit: null }];
      }),
    }));
    vi.doMock('../src/pipeline/retrieval/index', () => ({
      createRetrieval: vi.fn(() => {
        events.push('retrieval_create');
        return {
          search: vi.fn(() => {
            events.push('retrieval');
            return [{ food_id: 'test.food', name: 'Test food', score: 1 }];
          }),
        };
      }),
    }));
    vi.doMock('../src/pipeline/resolve', () => ({
      resolve: vi.fn((query: string, candidates: unknown[]) => {
        events.push('resolve');
        return {
          query,
          food_id: 'test.food',
          candidates,
          grams: 0,
          grams_p10: 0,
          grams_p90: 0,
          confidence: 1,
          nutrients: makeNutrients(),
          portion_source: 'not_applicable',
          portion_provenance: 'not_applicable',
        };
      }),
    }));
    vi.doMock('../src/pipeline/portion', () => ({
      estimate: vi.fn(() => {
        events.push('portion');
        return {
          grams: 100,
          p10: 65,
          p90: 145,
          source: 'catalogue_default',
          provenance: 'test',
        };
      }),
    }));
    vi.doMock('../src/pipeline/nutrition', () => ({
      scalePer100g: vi.fn(() => {
        events.push('nutrition');
        return makeNutrients({ kcal: 100 });
      }),
    }));
    vi.doMock('../src/pipeline/confidence', () => ({
      route: vi.fn((log: ReturnType<typeof makeMealLog>) => {
        events.push('confidence');
        log.action = 'auto_accept';
        return log;
      }),
    }));

    try {
      const mockedRunner = await import('../src/pipeline/runner');
      const vision = visionStub([makePerceivedItem({ surface_form: 'test food' })], events);
      await mockedRunner.run(
        vision,
        new VisionInput({ text: 'meal text' }),
        'test',
        mockedRunner.CONFIGS.V3,
        'runner-stage-order',
      );

      expect(events).toEqual([
        'retrieval_create',
        'load',
        'perception',
        'normalize',
        'retrieval',
        'resolve',
        'portion',
        'nutrition',
        'confidence',
      ]);
    } finally {
      vi.doUnmock('../src/locales/loader');
      vi.doUnmock('../src/pipeline/normalize');
      vi.doUnmock('../src/pipeline/retrieval/index');
      vi.doUnmock('../src/pipeline/resolve');
      vi.doUnmock('../src/pipeline/portion');
      vi.doUnmock('../src/pipeline/nutrition');
      vi.doUnmock('../src/pipeline/confidence');
      vi.resetModules();
    }
  });

  it('keeps the loader-backed pack available to the runner tests', () => {
    expect(load('en_US', PACK_ROOT).foods['us.eggs_scrambled']).toBeDefined();
  });
});
