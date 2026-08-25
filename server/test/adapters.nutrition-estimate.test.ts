import { describe, expect, it } from 'vitest';

import {
  GeminiNutritionEstimator,
  parseNutritionEstimate,
} from '../src/adapters/nutrition-estimate.gemini';
import { type Transport } from '../src/adapters/vision.gemini';

const FAKE_KEY = 'test-key';
const estimateDocument = {
  dish_name: 'Kıymalı pide',
  kcal: { low: 420, high: 680 },
  protein_g: { low: 18, high: 32 },
  carb_g: { low: 45, high: 78 },
  fat_g: { low: 16, high: 31 },
  assumptions: ['Bir orta boy pide varsayıldı.', 'Yağ miktarı görüntüden doğrulanamadı.'],
};

function envelope(document: unknown): string {
  return JSON.stringify({
    candidates: [{ content: { parts: [{ text: JSON.stringify(document) }] } }],
  });
}

describe('GeminiNutritionEstimator', () => {
  it('returns bounded ranges, a server midpoint, assumptions, and explicit unverified provenance', async () => {
    const calls: string[] = [];
    const transport: Transport = (request) => {
      calls.push(request.body);
      expect(request.headers['x-goog-api-key']).toBe(FAKE_KEY);
      return Promise.resolve({ status: 200, headers: {}, body: envelope(estimateDocument) });
    };
    const estimator = new GeminiNutritionEstimator({
      apiKey: FAKE_KEY,
      modelId: 'fake-model',
      transport,
    });

    const result = await estimator.estimate('pide', 1);

    expect(result).toEqual({
      dish_name: 'Kıymalı pide',
      kcal: { low: 420, midpoint: 550, high: 680 },
      protein_g: { low: 18, midpoint: 25, high: 32 },
      carb_g: { low: 45, midpoint: 61.5, high: 78 },
      fat_g: { low: 16, midpoint: 23.5, high: 31 },
      assumptions: estimateDocument.assumptions,
      provenance: 'llm_unverified_estimate',
      model_id: 'fake-model',
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain('Yemek: pide');
    expect(calls[0]).toContain('Miktar: 1');
  });

  it('rejects impossible or falsely precise provider ranges', () => {
    expect(() => parseNutritionEstimate(JSON.stringify({
      ...estimateDocument,
      kcal: { low: 900, high: 100 },
    }), 'fake-model')).toThrow('invalid kcal range');
    expect(() => parseNutritionEstimate(JSON.stringify({
      ...estimateDocument,
      kcal: { low: 100, high: 5001 },
    }), 'fake-model')).toThrow('invalid kcal range');
  });

  it('maps provider failure to the typed unavailable boundary without exposing its body', async () => {
    const transport: Transport = () => Promise.resolve({
      status: 429,
      headers: {},
      body: 'secret provider envelope',
    });
    const estimator = new GeminiNutritionEstimator({ apiKey: FAKE_KEY, transport });

    await expect(estimator.estimate('pide', null)).rejects.toMatchObject({
      category: 'provider_unavailable',
      attempts: 1,
      detail: 'vision provider unavailable',
    });
  });
});
