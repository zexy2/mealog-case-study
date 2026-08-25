import { describe, expect, it } from 'vitest';

import {
  GeminiNutritionEstimator,
  parseNutritionEstimate,
  parseNutritionEstimates,
} from '../src/adapters/nutrition-estimate.gemini';
import { type Transport } from '../src/adapters/vision.gemini';

const FAKE_KEY = 'test-key';
const estimateDocument = {
  request_index: 0,
  dish_name: 'Kıymalı pide',
  kcal: { low: 420, high: 680 },
  protein_g: { low: 18, high: 32 },
  carb_g: { low: 45, high: 78 },
  fat_g: { low: 16, high: 31 },
  assumptions: ['Bir orta boy pide varsayıldı.', 'Yağ miktarı görüntüden doğrulanamadı.'],
};

function envelope(document: unknown): string {
  return JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(document) }] } }] });
}

describe('GeminiNutritionEstimator', () => {
  it('estimates multiple items in one provider call and restores request order', async () => {
    const calls: string[] = [];
    const transport: Transport = (request) => {
      calls.push(request.body);
      expect(request.headers['x-goog-api-key']).toBe(FAKE_KEY);
      return Promise.resolve({
        status: 200,
        headers: {},
        body: envelope({ estimates: [
          { ...estimateDocument, request_index: 1, dish_name: 'Piyaz' },
          estimateDocument,
        ] }),
      });
    };
    const estimator = new GeminiNutritionEstimator({ apiKey: FAKE_KEY, modelId: 'fake-model', transport });

    const result = await estimator.estimateMany([
      { dish_name: 'pide', quantity: 1 },
      { dish_name: 'piyaz', quantity: null },
    ], 'user\u0000meal-1');

    expect(result.map((row) => row.dish_name)).toEqual(['Kıymalı pide', 'Piyaz']);
    expect(result[0]).toMatchObject({
      kcal: { low: 420, midpoint: 550, high: 680 },
      provenance: 'llm_unverified_estimate',
      model_id: 'fake-model',
    });
    expect(calls).toHaveLength(1);
    const sent = JSON.parse(calls[0]) as { contents: Array<{ parts: Array<{ text: string }> }> };
    expect(sent.contents[0].parts[0].text).toContain('"dish_name":"pide"');
    expect(sent.contents[0].parts[0].text).toContain('"dish_name":"piyaz"');
  });

  it('replays identical idempotent batches and rejects conflicting payloads', async () => {
    let calls = 0;
    const transport: Transport = () => {
      calls += 1;
      return Promise.resolve({ status: 200, headers: {}, body: envelope({ estimates: [estimateDocument] }) });
    };
    const estimator = new GeminiNutritionEstimator({ apiKey: FAKE_KEY, transport });
    const items = [{ dish_name: 'pide', quantity: 1 }] as const;

    const first = await estimator.estimateMany(items, 'user\u0000same');
    const second = await estimator.estimateMany(items, 'user\u0000same');

    expect(second).toEqual(first);
    expect(calls).toBe(1);
    await expect(estimator.estimateMany([{ dish_name: 'piyaz', quantity: 1 }], 'user\u0000same'))
      .rejects.toThrow('idempotency key reused');
  });

  it('does not resurrect a purged cache or delete a replacement in-flight request', async () => {
    const releases: Array<() => void> = [];
    let calls = 0;
    const transport: Transport = async () => {
      calls += 1;
      await new Promise<void>((resolve) => releases.push(resolve));
      return { status: 200, headers: {}, body: envelope({ estimates: [estimateDocument] }) };
    };
    const estimator = new GeminiNutritionEstimator({ apiKey: FAKE_KEY, transport });
    const items = [{ dish_name: 'pide', quantity: 1 }] as const;
    const key = 'user\u0000purged';

    const beforePurge = estimator.estimateMany(items, key);
    estimator.purgeUserData('user');
    const afterPurge = estimator.estimateMany(items, key);
    releases[0]();
    await beforePurge;

    expect(estimator.hasPendingOrCompleted(key)).toBe(true);
    releases[1]();
    await afterPurge;
    expect(calls).toBe(2);
    await estimator.estimateMany(items, key);
    expect(calls).toBe(2);
  });

  it('rejects impossible ranges, missing rows, and duplicate indexes', () => {
    expect(() => parseNutritionEstimate({ ...estimateDocument, kcal: { low: 900, high: 100 } }, 'fake-model'))
      .toThrow('invalid kcal range');
    expect(() => parseNutritionEstimate({ ...estimateDocument, kcal: { low: 100, high: 5001 } }, 'fake-model'))
      .toThrow('invalid kcal range');
    expect(() => parseNutritionEstimates(JSON.stringify({ estimates: [estimateDocument] }), 'fake-model', 2))
      .toThrow('count mismatch');
    expect(() => parseNutritionEstimates(JSON.stringify({ estimates: [
      estimateDocument,
      { ...estimateDocument, dish_name: 'Piyaz' },
    ] }), 'fake-model', 2)).toThrow('duplicate request_index');
  });

  it('opens the circuit after three provider failures', async () => {
    let calls = 0;
    const transport: Transport = () => {
      calls += 1;
      return Promise.resolve({ status: 429, headers: {}, body: 'secret provider envelope' });
    };
    const estimator = new GeminiNutritionEstimator({ apiKey: FAKE_KEY, transport });

    for (let index = 0; index < 3; index += 1) {
      await expect(estimator.estimateMany([{ dish_name: 'pide', quantity: null }], `user\u0000${index}`))
        .rejects.toMatchObject({ category: 'provider_unavailable', attempts: 1 });
    }
    await expect(estimator.estimateMany([{ dish_name: 'pide', quantity: null }], 'user\u0000circuit'))
      .rejects.toMatchObject({ category: 'provider_unavailable', attempts: 0 });
    expect(calls).toBe(3);
  });

  it('rejects a batch above the 20-item product limit before provider execution', async () => {
    let called = false;
    const estimator = new GeminiNutritionEstimator({
      apiKey: FAKE_KEY,
      transport: () => {
        called = true;
        return Promise.resolve({ status: 200, headers: {}, body: '' });
      },
    });
    const items = Array.from({ length: 21 }, (_, index) => ({ dish_name: `food-${index}`, quantity: 1 }));

    await expect(estimator.estimateMany(items, 'user\u0000too-many')).rejects.toThrow('expected 1-20');
    expect(called).toBe(false);
  });
});
