import {
  API_ROOT,
  configuredModelId,
  responseText,
  VisionProviderError,
  type Transport,
  type TransportResponse,
} from './vision.gemini';

export const NUTRITION_ESTIMATE_PORT = Symbol('NUTRITION_ESTIMATE_PORT');
export const ESTIMATE_TIMEOUT_MS = 20_000;

export interface NutritionRange {
  readonly low: number;
  readonly midpoint: number;
  readonly high: number;
}

export interface UnverifiedNutritionEstimate {
  readonly dish_name: string;
  readonly kcal: NutritionRange;
  readonly protein_g: NutritionRange;
  readonly carb_g: NutritionRange;
  readonly fat_g: NutritionRange;
  readonly assumptions: readonly string[];
  readonly provenance: 'llm_unverified_estimate';
  readonly model_id: string;
}

export interface NutritionEstimatePort {
  estimate(dishName: string, quantity: number | null): Promise<UnverifiedNutritionEstimate>;
}

const SYSTEM_PROMPT = `You estimate broad nutrition ranges for a food that could not be
matched to a verified catalogue. This is an explicitly unverified fallback, not
laboratory nutrition. Use general learned knowledge. Never claim a source, database,
medical accuracy, or visual certainty. Return p10-like low and p90-like high bounds;
avoid false precision. State the serving and preparation assumptions in Turkish.`;

const RANGE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    low: { type: 'NUMBER', minimum: 0 },
    high: { type: 'NUMBER', minimum: 0 },
  },
  required: ['low', 'high'],
};

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    dish_name: { type: 'STRING' },
    kcal: RANGE_SCHEMA,
    protein_g: RANGE_SCHEMA,
    carb_g: RANGE_SCHEMA,
    fat_g: RANGE_SCHEMA,
    assumptions: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['dish_name', 'kcal', 'protein_g', 'carb_g', 'fat_g', 'assumptions'],
};

const defaultTransport: Transport = async (request): Promise<TransportResponse> => {
  const response = await fetch(request.url, {
    method: request.method,
    headers: { ...request.headers },
    body: request.body,
    signal: AbortSignal.timeout(request.timeoutMs),
  });
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });
  return { status: response.status, headers, body: await response.text() };
};

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`invalid ${label}`);
  }
  return value as Record<string, unknown>;
}

function range(value: unknown, label: string, maximum: number): NutritionRange {
  const parsed = record(value, label);
  const low = parsed.low;
  const high = parsed.high;
  if (
    typeof low !== 'number'
    || typeof high !== 'number'
    || !Number.isFinite(low)
    || !Number.isFinite(high)
    || low < 0
    || high < low
    || high > maximum
  ) {
    throw new Error(`invalid ${label} range`);
  }
  return {
    low: Math.round(low * 10) / 10,
    midpoint: Math.round(((low + high) / 2) * 10) / 10,
    high: Math.round(high * 10) / 10,
  };
}

export function parseNutritionEstimate(
  text: string,
  modelId: string,
): UnverifiedNutritionEstimate {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('Gemini nutrition estimate was not JSON');
  }
  const parsed = record(raw, 'nutrition estimate');
  const dishName = parsed.dish_name;
  const assumptions = parsed.assumptions;
  if (typeof dishName !== 'string' || !dishName.trim() || dishName.length > 160) {
    throw new Error('invalid dish_name');
  }
  if (
    !Array.isArray(assumptions)
    || assumptions.length < 1
    || assumptions.length > 6
    || assumptions.some((item) => typeof item !== 'string' || !item.trim() || item.length > 240)
  ) {
    throw new Error('invalid assumptions');
  }

  return {
    dish_name: dishName.trim(),
    kcal: range(parsed.kcal, 'kcal', 5_000),
    protein_g: range(parsed.protein_g, 'protein_g', 500),
    carb_g: range(parsed.carb_g, 'carb_g', 800),
    fat_g: range(parsed.fat_g, 'fat_g', 500),
    assumptions: assumptions.map((item) => (item as string).trim()),
    provenance: 'llm_unverified_estimate',
    model_id: modelId,
  };
}

export class GeminiNutritionEstimator implements NutritionEstimatePort {
  private readonly apiKey: string;
  private readonly modelId: string;
  private readonly transport: Transport;

  constructor(options: { apiKey: string; modelId?: string; transport?: Transport }) {
    if (!options.apiKey.trim()) throw new Error('GEMINI_API_KEY is required');
    this.apiKey = options.apiKey;
    this.modelId = options.modelId ?? configuredModelId();
    this.transport = options.transport ?? defaultTransport;
  }

  async estimate(dishName: string, quantity: number | null): Promise<UnverifiedNutritionEstimate> {
    const payload = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{
        role: 'user',
        parts: [{
          text: `Yemek: ${dishName}\nMiktar: ${quantity ?? 'belirsiz'}\nGeniş ve dürüst besin aralığı üret.`,
        }],
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    };

    let response: TransportResponse;
    try {
      response = await this.transport({
        url: `${API_ROOT}/models/${encodeURIComponent(this.modelId)}:generateContent`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
        body: JSON.stringify(payload),
        timeoutMs: ESTIMATE_TIMEOUT_MS,
      });
    } catch (error) {
      const timeout = error instanceof Error && /timeout|abort/i.test(error.name + error.message);
      throw new VisionProviderError(timeout ? 'provider_timeout' : 'provider_unavailable', 1);
    }
    if (response.status < 200 || response.status >= 300) {
      throw new VisionProviderError('provider_unavailable', 1);
    }
    try {
      const envelope = JSON.parse(response.body) as Record<string, unknown>;
      return parseNutritionEstimate(responseText(envelope), this.modelId);
    } catch (error) {
      throw new VisionProviderError(
        'provider_unavailable',
        1,
        error instanceof Error ? error.message : 'invalid nutrition estimate',
      );
    }
  }
}

export class DisabledNutritionEstimator implements NutritionEstimatePort {
  estimate(): Promise<UnverifiedNutritionEstimate> {
    return Promise.reject(new VisionProviderError('provider_unavailable', 0));
  }
}
