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
export const MAX_ESTIMATE_ITEMS = 20;
export const ESTIMATE_CACHE_SIZE = 500;
export const CIRCUIT_FAILURE_THRESHOLD = 3;
export const CIRCUIT_OPEN_MS = 60_000;

export interface NutritionEstimateInput {
  readonly dish_name: string;
  readonly quantity: number | null;
}

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
  hasPendingOrCompleted(idempotencyKey: string): boolean;
  estimateMany(
    items: readonly NutritionEstimateInput[],
    idempotencyKey: string,
  ): Promise<readonly UnverifiedNutritionEstimate[]>;
  purgeUserData(userId: string): void;
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

const ESTIMATE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    request_index: { type: 'INTEGER', minimum: 0, maximum: MAX_ESTIMATE_ITEMS - 1 },
    dish_name: { type: 'STRING' },
    kcal: RANGE_SCHEMA,
    protein_g: RANGE_SCHEMA,
    carb_g: RANGE_SCHEMA,
    fat_g: RANGE_SCHEMA,
    assumptions: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['request_index', 'dish_name', 'kcal', 'protein_g', 'carb_g', 'fat_g', 'assumptions'],
};

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    estimates: {
      type: 'ARRAY',
      items: ESTIMATE_SCHEMA,
    },
  },
  required: ['estimates'],
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
  value: unknown,
  modelId: string,
): UnverifiedNutritionEstimate {
  const parsed = record(value, 'nutrition estimate');
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

export function parseNutritionEstimates(
  text: string,
  modelId: string,
  expectedCount: number,
): readonly UnverifiedNutritionEstimate[] {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('Gemini nutrition estimate was not JSON');
  }
  const document = record(raw, 'nutrition estimates');
  const estimates = document.estimates;
  if (!Array.isArray(estimates) || estimates.length !== expectedCount) {
    throw new Error('nutrition estimate count mismatch');
  }
  const indexed = estimates.map((estimate) => {
    const row = record(estimate, 'nutrition estimate');
    const requestIndex = row.request_index;
    if (!Number.isInteger(requestIndex) || (requestIndex as number) < 0 || (requestIndex as number) >= expectedCount) {
      throw new Error('invalid request_index');
    }
    return { requestIndex: requestIndex as number, estimate: parseNutritionEstimate(row, modelId) };
  });
  const uniqueIndexes = new Set(indexed.map((row) => row.requestIndex));
  if (uniqueIndexes.size !== expectedCount) {
    throw new Error('duplicate request_index');
  }
  return indexed.sort((a, b) => a.requestIndex - b.requestIndex).map((row) => row.estimate);
}

interface EstimateCacheEntry {
  readonly fingerprint: string;
  readonly result: readonly UnverifiedNutritionEstimate[];
}

interface EstimateInFlightEntry {
  readonly fingerprint: string;
  readonly promise: Promise<readonly UnverifiedNutritionEstimate[]>;
  readonly token: object;
}

export class GeminiNutritionEstimator implements NutritionEstimatePort {
  private readonly apiKey: string;
  private readonly modelId: string;
  private readonly transport: Transport;
  private readonly completed = new Map<string, EstimateCacheEntry>();
  private readonly inFlight = new Map<string, EstimateInFlightEntry>();
  private readonly userGenerations = new Map<string, number>();
  private consecutiveFailures = 0;
  private circuitOpenedAt: number | null = null;

  constructor(options: { apiKey: string; modelId?: string; transport?: Transport }) {
    if (!options.apiKey.trim()) throw new Error('GEMINI_API_KEY is required');
    this.apiKey = options.apiKey;
    this.modelId = options.modelId ?? configuredModelId();
    this.transport = options.transport ?? defaultTransport;
  }

  hasPendingOrCompleted(idempotencyKey: string): boolean {
    return this.completed.has(idempotencyKey) || this.inFlight.has(idempotencyKey);
  }

  purgeUserData(userId: string): void {
    const cleanUserId = userId.trim();
    const prefix = `${cleanUserId}\u0000`;
    this.userGenerations.set(cleanUserId, (this.userGenerations.get(cleanUserId) ?? 0) + 1);
    for (const key of this.completed.keys()) {
      if (key.startsWith(prefix)) this.completed.delete(key);
    }
    for (const key of this.inFlight.keys()) {
      if (key.startsWith(prefix)) this.inFlight.delete(key);
    }
  }

  estimateMany(
    items: readonly NutritionEstimateInput[],
    idempotencyKey: string,
  ): Promise<readonly UnverifiedNutritionEstimate[]> {
    if (items.length < 1 || items.length > MAX_ESTIMATE_ITEMS) {
      return Promise.reject(new Error(`expected 1-${MAX_ESTIMATE_ITEMS} estimate items`));
    }
    const fingerprint = JSON.stringify(items);
    const cached = this.completed.get(idempotencyKey);
    if (cached) {
      if (cached.fingerprint !== fingerprint) {
        return Promise.reject(new Error('idempotency key reused with different estimate payload'));
      }
      this.completed.delete(idempotencyKey);
      this.completed.set(idempotencyKey, cached);
      return Promise.resolve(cached.result);
    }
    const pending = this.inFlight.get(idempotencyKey);
    if (pending) {
      if (pending.fingerprint !== fingerprint) {
        return Promise.reject(new Error('idempotency key reused with different estimate payload'));
      }
      return pending.promise;
    }
    if (this.circuitOpenedAt !== null) {
      if (Date.now() - this.circuitOpenedAt < CIRCUIT_OPEN_MS) {
        return Promise.reject(new VisionProviderError('provider_unavailable', 0));
      }
      this.circuitOpenedAt = null;
      this.consecutiveFailures = 0;
    }
    const userId = idempotencyKey.split('\u0000', 1)[0];
    const generation = this.userGenerations.get(userId) ?? 0;
    const token = {};
    const promise = this.runBatch(items, idempotencyKey, fingerprint, userId, generation, token);
    this.inFlight.set(idempotencyKey, { fingerprint, promise, token });
    return promise;
  }

  private async runBatch(
    items: readonly NutritionEstimateInput[],
    idempotencyKey: string,
    fingerprint: string,
    userId: string,
    generation: number,
    token: object,
  ): Promise<readonly UnverifiedNutritionEstimate[]> {
    const payload = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{
        role: 'user',
        parts: [{
          text: `Aşağıdaki öğeleri aynı sırayla değerlendir. Her sonuç request_index taşısın.\n${JSON.stringify(items)}\nGeniş ve dürüst besin aralıkları üret.`,
        }],
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    };

    try {
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
      const envelope = JSON.parse(response.body) as Record<string, unknown>;
      const result = parseNutritionEstimates(responseText(envelope), this.modelId, items.length);
      this.consecutiveFailures = 0;
      if (this.completed.size >= ESTIMATE_CACHE_SIZE) {
        const oldest = this.completed.keys().next().value;
        if (oldest) this.completed.delete(oldest);
      }
      if ((this.userGenerations.get(userId) ?? 0) === generation) {
        this.completed.set(idempotencyKey, { fingerprint, result });
      }
      return result;
    } catch (error) {
      this.consecutiveFailures += 1;
      if (this.consecutiveFailures >= CIRCUIT_FAILURE_THRESHOLD) {
        this.circuitOpenedAt = Date.now();
      }
      if (error instanceof VisionProviderError) throw error;
      throw new VisionProviderError('provider_unavailable', 1, error instanceof Error ? error.message : 'invalid nutrition estimate');
    } finally {
      if (this.inFlight.get(idempotencyKey)?.token === token) {
        this.inFlight.delete(idempotencyKey);
      }
    }
  }
}

export class DisabledNutritionEstimator implements NutritionEstimatePort {
  hasPendingOrCompleted(): boolean {
    return false;
  }

  estimateMany(): Promise<readonly UnverifiedNutritionEstimate[]> {
    return Promise.reject(new VisionProviderError('provider_unavailable', 0));
  }

  purgeUserData(): void {}
}
