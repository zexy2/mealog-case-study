/**
 * Live Gemini vision adapter.
 *
 * The adapter owns only provider I/O and response validation. It returns
 * observed items, never catalogue IDs or nutrient values. The evaluation
 * harness can turn that validated response into an offline fixture without
 * storing the input image or the API response envelope.
 *
 * Ported from `server/src/mealog/adapters/vision_gemini.py`. Constants, the
 * prompt, the response schema, the retry/fallback ladder and the fixture
 * payload shape carry across unchanged; a renamed field or a reordered payload
 * key would silently invalidate the 25 recorded fixtures, which are the parity
 * reference for the whole port.
 *
 * This module is framework-agnostic by rule: an adapter is a port
 * implementation, not an edge concern, so `src/adapters/` sits under the same
 * no-framework invariant as `src/pipeline/` and `scripts/check_invariants.py`
 * fails the build if one appears.
 */

import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { VisionInput, type VisionResult } from '../pipeline/ports';
import type { PerceivedItem } from '../domain/models';
import { makePerceivedItem } from '../domain/models';

export const PROMPT_VERSION = 'p2';
export const DEFAULT_MODEL = 'gemini-flash-lite-latest';
export const SECONDARY_MODEL = 'gemini-2.5-flash-lite';
export const MODEL_ENV_VAR = 'GEMINI_MODEL';
export const REQUEST_INTERVAL_SECONDS = 4.0;
export const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta';
export const MAX_ERROR_BODY = 500;
export const TRANSIENT_STATUS_CODES: ReadonlySet<number> = new Set([429, 500, 502, 503, 504]);
export const NON_RETRYABLE_STATUS_CODES: ReadonlySet<number> = new Set([400, 401]);
export const MAX_ATTEMPTS = 3;
export const MAX_ELAPSED_SECONDS = 30.0;
export const BACKOFF_BASE_SECONDS = 0.25;
export const BACKOFF_CAP_SECONDS = 2.0;
export const RUNG_CONFIGURED_MODEL = 'configured_model';
export const RUNG_SECONDARY_MODEL = 'secondary_model';
export const RUNG_TEXT_ONLY = 'text_only';
export const RUNG_FAILURE = 'failure';

export const SYSTEM_PROMPT = `You list what food is visible in the supplied image or text.
Return observed items only. You do NOT estimate calories, macros, nutrients, or
grams. The downstream catalogue and nutrition stages handle those values.

Rules:
- Name dishes in the language on the plate's origin if you recognise it.
- If unsure between two dishes, return the more general one and lower confidence.
- Never invent an item you cannot see. Omission is cheaper than invention.
- \`portion_hint\` may describe a visible serving or user-provided text, but is not
  a numeric gram estimate.
`;

export const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          surface_form: {
            type: 'STRING',
            description: "The visible dish or food name.",
          },
          cooking_method: {
            type: 'STRING',
            description: 'Visible or explicitly stated cooking method.',
          },
          portion_hint: {
            type: 'STRING',
            description: 'Non-numeric serving description, if visible or stated.',
          },
          confidence: {
            type: 'NUMBER',
            minimum: 0,
            maximum: 1,
            description: 'Confidence that this item is present, from 0 to 1.',
          },
        },
        required: ['surface_form', 'cooking_method', 'portion_hint', 'confidence'],
      },
    },
  },
  required: ['items'],
} as const;

/**
 * D1, enforced rather than trusted.
 *
 * The vision stage returns *references*, never numbers. A response carrying any
 * of these is a provider that has started guessing nutrition, and the correct
 * response is to reject the whole response — not to drop the field and carry
 * on, which would hide exactly the failure the architecture claims is
 * impossible.
 */
export const FORBIDDEN_NUTRIENT_FIELDS: ReadonlySet<string> = new Set([
  'kcal',
  'calories',
  'carb_g',
  'fat_g',
  'food_id',
  'grams',
  'nutrients',
  'protein_g',
  'ungrounded_kcal',
]);

export const ALLOWED_ITEM_FIELDS: ReadonlySet<string> = new Set(
  Object.keys(RESPONSE_SCHEMA.properties.items.items.properties),
);

const IMAGE_MIME_FALLBACKS: Readonly<Record<string, string>> = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export const ALLOWED_IMAGE_MIME_TYPES: ReadonlySet<string> = new Set([
  ...Object.values(IMAGE_MIME_FALLBACKS),
  'image/jpg',
]);

const HEIC_BRANDS: ReadonlySet<string> = new Set(['heic', 'heix', 'hevc', 'hevx']);
const HEIF_BRANDS: ReadonlySet<string> = new Set([
  ...HEIC_BRANDS,
  'mif1',
  'mif2',
  'msf1',
]);
const AVIF_BRANDS: ReadonlySet<string> = new Set(['avif', 'avis']);

function startsWithBytes(bytes: Uint8Array, signature: readonly number[]): boolean {
  return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  if (offset < 0 || bytes.length < offset + length) return '';
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function hasFileTypeBrand(bytes: Uint8Array, brands: ReadonlySet<string>): boolean {
  if (bytes.length < 16 || ascii(bytes, 4, 4) !== 'ftyp') return false;
  if (brands.has(ascii(bytes, 8, 4))) return true;
  for (let offset = 16; offset + 4 <= bytes.length; offset += 4) {
    if (brands.has(ascii(bytes, offset, 4))) return true;
  }
  return false;
}

/** Validate content signatures after the transport's declared MIME allow-list. */
export function isSupportedImageBytes(mediaType: string, bytes: Uint8Array): boolean {
  switch (mediaType.toLowerCase()) {
    case 'image/jpeg':
    case 'image/jpg':
      return startsWithBytes(bytes, [0xff, 0xd8, 0xff]);
    case 'image/png':
      return startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case 'image/gif':
      return ascii(bytes, 0, 6) === 'GIF87a' || ascii(bytes, 0, 6) === 'GIF89a';
    case 'image/webp':
      return ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP';
    case 'image/avif':
      return hasFileTypeBrand(bytes, AVIF_BRANDS);
    case 'image/heic':
      return hasFileTypeBrand(bytes, HEIC_BRANDS);
    case 'image/heif':
      return hasFileTypeBrand(bytes, HEIF_BRANDS);
    default:
      return false;
  }
}

/** Read the live model from environment-backed application config. */
export function configuredModelId(env: NodeJS.ProcessEnv = process.env): string {
  return (env[MODEL_ENV_VAR] ?? DEFAULT_MODEL).trim() || DEFAULT_MODEL;
}

export interface ProviderFailureInit {
  status?: number | null;
  retryable?: boolean;
  fallbackAllowed?: boolean;
  retryAfter?: number | null;
  attempts?: number;
}

export class ProviderFailure extends Error {
  readonly status: number | null;
  readonly retryable: boolean;
  readonly fallbackAllowed: boolean;
  readonly retryAfter: number | null;
  attempts: number;

  constructor(message: string, init: ProviderFailureInit = {}) {
    super(message);
    this.name = 'ProviderFailure';
    this.status = init.status ?? null;
    this.retryable = init.retryable ?? false;
    this.fallbackAllowed = init.fallbackAllowed ?? true;
    this.retryAfter = init.retryAfter ?? null;
    this.attempts = init.attempts ?? 0;
  }
}

/** `Retry-After` as seconds, accepting both the delta and HTTP-date forms. */
export function retryAfterSeconds(
  headers: Readonly<Record<string, string | undefined>> | undefined,
  now: () => number = () => Date.now(),
): number | null {
  const value = headers?.['retry-after'] ?? headers?.['Retry-After'];
  if (!value) {
    return null;
  }
  const asNumber = Number(value);
  if (Number.isFinite(asNumber)) {
    return Math.max(0, asNumber);
  }
  const retryAt = Date.parse(value);
  if (Number.isNaN(retryAt)) {
    return null;
  }
  return Math.max(0, (retryAt - now()) / 1000);
}

export function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      return true;
    }
    return error.message.toLowerCase().includes('timed out');
  }
  return String(error).toLowerCase().includes('timed out');
}

/** Build the inline image part, refusing anything outside the allow-list. */
export function imagePart(input: VisionInput): Record<string, unknown> {
  if (input.imageBytes === null || !input.imageMediaType) {
    throw new Error('Gemini image input needs bytes and a MIME type');
  }
  const mimeType = input.imageMediaType.toLowerCase();
  if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
    throw new Error(`unsupported Gemini image MIME type '${mimeType}'`);
  }
  if (input.imageBytes.length > 10 * 1024 * 1024) {
    throw new Error('Gemini image exceeds 10 MiB limit');
  }
  if (!isSupportedImageBytes(mimeType, input.imageBytes)) {
    throw new Error(`unsupported Gemini image content '${mimeType}'`);
  }
  return {
    inlineData: {
      mimeType,
      data: Buffer.from(input.imageBytes).toString('base64'),
    },
  };
}

/**
 * Render an untrusted provider value for an error message.
 *
 * The failure reason comes straight off the wire and may be a string, an
 * object, or absent. `String()` on an object yields `[object Object]`, which
 * turns a diagnosable provider failure into a shrug.
 */
function describe(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return '[unserialisable]';
  }
}

export function responseText(response: Record<string, unknown>): string {
  const candidates = response.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    const reason = response.promptFeedback ?? response.error ?? 'no candidates';
    throw new Error(`Gemini returned no candidate: ${describe(reason)}`);
  }

  const candidate: unknown = candidates[0];
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    throw new TypeError('Gemini returned an invalid candidate');
  }
  const content = (candidate as { content?: { parts?: unknown } }).content;
  const parts = Array.isArray(content?.parts) ? content.parts : [];
  const text = parts
    .map((part) =>
      typeof part === 'object' && part !== null && typeof (part as { text?: unknown }).text === 'string'
        ? (part as { text: string }).text
        : '',
    )
    .join('');
  if (!text) {
    const reason = (candidate as { finishReason?: unknown }).finishReason ?? 'empty response';
    throw new Error(`Gemini returned no text candidate: ${describe(reason)}`);
  }
  return text;
}

/**
 * Validate one provider response's items into observations.
 *
 * The forbidden-field check runs *before* the unknown-field check so that a
 * response carrying `kcal` reports the D1 violation rather than the generic
 * "unknown field", which is the difference between a diagnosable failure and a
 * shrug. Both reject the whole response.
 */
export function parseObservationItems(rawItems: unknown, label = 'Gemini'): PerceivedItem[] {
  if (!Array.isArray(rawItems)) {
    throw new TypeError(`${label} JSON response must contain an items array`);
  }

  return rawItems.map((raw, index) => {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      throw new TypeError(`${label} item ${index} is not an object`);
    }
    const record = raw as Record<string, unknown>;
    const present = Object.keys(record);

    const forbidden = present.filter((key) => FORBIDDEN_NUTRIENT_FIELDS.has(key)).sort();
    if (forbidden.length > 0) {
      throw new Error(
        `${label} item ${index} contains forbidden nutrient field(s): ${forbidden.join(', ')}`,
      );
    }
    const unknown = present.filter((key) => !ALLOWED_ITEM_FIELDS.has(key)).sort();
    if (unknown.length > 0) {
      throw new Error(`${label} item ${index} contains unknown field(s): ${unknown.join(', ')}`);
    }

    const surfaceForm = record.surface_form;
    if (typeof surfaceForm !== 'string') {
      throw new Error(`${label} item ${index} failed response validation`);
    }
    const confidenceRaw = record.confidence ?? 0.5;
    if (typeof confidenceRaw !== 'number' || Number.isNaN(confidenceRaw)) {
      throw new Error(`${label} item ${index} failed response validation`);
    }
    for (const optional of ['cooking_method', 'portion_hint'] as const) {
      const value = record[optional];
      if (value !== undefined && value !== null && typeof value !== 'string') {
        throw new Error(`${label} item ${index} failed response validation`);
      }
    }

    if (!surfaceForm.trim()) {
      throw new Error(`${label} item ${index} has an empty surface_form`);
    }
    if (!(confidenceRaw >= 0 && confidenceRaw <= 1)) {
      throw new Error(`${label} item ${index} confidence is outside [0, 1]`);
    }

    return makePerceivedItem({
      surface_form: surfaceForm,
      cooking_method: (record.cooking_method as string | null | undefined) ?? null,
      portion_hint: (record.portion_hint as string | null | undefined) ?? null,
      confidence: confidenceRaw,
    });
  });
}

export function parseItems(text: string): PerceivedItem[] {
  let document: unknown;
  try {
    document = JSON.parse(text);
  } catch {
    throw new Error('Gemini returned non-JSON text despite JSON schema mode');
  }
  if (typeof document !== 'object' || document === null || Array.isArray(document)) {
    throw new TypeError('Gemini JSON response must contain an items array');
  }
  return parseObservationItems((document as { items?: unknown }).items);
}

// --------------------------------------------------------------- transport

export interface TransportRequest {
  readonly url: string;
  readonly method: 'POST';
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
  readonly timeoutMs: number;
}

export interface TransportResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string | undefined>>;
  readonly body: string;
}

/**
 * The seam the tests replace. Python injects `opener`; this is the same idea
 * with an explicit request/response shape, so a test never needs a key, a
 * network, or a mocked global.
 */
export type Transport = (request: TransportRequest) => Promise<TransportResponse>;

const fetchTransport: Transport = async (request) => {
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

/** Structured observability hook. `obs.event` in Python; injected here. */
export type EventSink = (name: string, fields: Record<string, unknown>) => void;

export interface GeminiVisionOptions {
  readonly apiKey: string;
  readonly model?: string | null;
  readonly modelId?: string | null;
  readonly timeout?: number;
  readonly transport?: Transport;
  readonly secondaryModel?: string | null;
  readonly maxAttempts?: number;
  readonly maxElapsed?: number;
  readonly sleepFn?: (seconds: number) => Promise<void>;
  readonly clockFn?: () => number;
  readonly jitterFn?: (cap: number) => number;
  readonly requestInterval?: number;
  readonly onEvent?: EventSink;
  readonly env?: NodeJS.ProcessEnv;
}

export interface FixturePayload {
  readonly _synthetic: false;
  readonly sample_id: string | null;
  readonly input_sha256: string | null;
  readonly provider: string;
  readonly model_id: string;
  readonly prompt_version: string;
  readonly degraded: boolean;
  readonly rung: string;
  readonly attempts: number;
  readonly items: Record<string, unknown>[];
}

export class GeminiVision {
  readonly name = 'gemini';

  readonly apiKey: string;
  readonly modelId: string;
  readonly model: string;
  readonly timeout: number;
  readonly secondaryModel: string | null;
  readonly maxAttempts: number;
  readonly maxElapsed: number;
  readonly requestInterval: number;

  requestCount = 0;
  lastItems: PerceivedItem[] | null = null;
  /** Strong only while perceive is in flight; recording uses the weak identity below. */
  lastInput: VisionInput | null = null;
  degraded = false;
  rung: string = RUNG_CONFIGURED_MODEL;
  lastModel: string;
  lastAttempts = 0;

  private readonly transport: Transport;
  private readonly sleep: (seconds: number) => Promise<void>;
  private readonly clock: () => number;
  private readonly jitter: (cap: number) => number;
  private readonly onEvent: EventSink;
  private lastRequestStarted: number | null = null;
  private lastInputRef: WeakRef<VisionInput> | null = null;

  constructor(options: GeminiVisionOptions) {
    if (!options.apiKey.trim()) {
      throw new Error('GEMINI_API_KEY is required for the live vision provider');
    }
    this.apiKey = options.apiKey;
    this.modelId = options.modelId ?? options.model ?? configuredModelId(options.env);
    this.model = this.modelId;
    this.timeout = options.timeout ?? 90.0;
    this.transport = options.transport ?? fetchTransport;
    this.secondaryModel = options.secondaryModel === undefined ? SECONDARY_MODEL : options.secondaryModel;
    this.maxAttempts = Math.min(MAX_ATTEMPTS, Math.max(1, options.maxAttempts ?? MAX_ATTEMPTS));
    this.maxElapsed = Math.min(MAX_ELAPSED_SECONDS, Math.max(0.1, options.maxElapsed ?? MAX_ELAPSED_SECONDS));
    this.sleep = options.sleepFn ?? ((seconds) => new Promise((r) => setTimeout(r, seconds * 1000)));
    this.clock = options.clockFn ?? (() => Date.now() / 1000);
    this.jitter = options.jitterFn ?? ((cap) => Math.random() * cap);
    this.requestInterval = Math.max(0, options.requestInterval ?? REQUEST_INTERVAL_SECONDS);
    this.onEvent = options.onEvent ?? (() => undefined);
    this.lastModel = this.modelId;
  }

  /**
   * Free-tier pacing. Python sleeps the remainder of the interval since the
   * previous request started; the recorder depends on it to stay inside quota.
   */
  private async waitForRequestSlot(): Promise<void> {
    const now = this.clock();
    if (this.lastRequestStarted !== null) {
      const remaining = this.requestInterval - (now - this.lastRequestStarted);
      if (remaining > 0) {
        await this.sleep(remaining);
      }
    }
    this.lastRequestStarted = this.clock();
  }

  private async request(
    parts: Record<string, unknown>[],
    model: string,
    timeout: number,
  ): Promise<Record<string, unknown>> {
    const payload = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    };
    const url = `${API_ROOT}/models/${encodeURIComponent(model)}:generateContent`;

    await this.waitForRequestSlot();
    this.requestCount += 1;

    let response: TransportResponse;
    try {
      response = await this.transport({
        url,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify(payload),
        timeoutMs: Math.round(timeout * 1000),
      });
    } catch (error) {
      if (isTimeoutError(error)) {
        throw new ProviderFailure('Gemini request timed out', { retryable: true });
      }
      throw new ProviderFailure(
        `Gemini request failed: ${error instanceof Error ? error.message : String(error)}`,
        { retryable: false },
      );
    }

    if (response.status < 200 || response.status >= 300) {
      const detail = response.body.slice(0, MAX_ERROR_BODY);
      throw new ProviderFailure(`Gemini request failed with HTTP ${response.status}: ${detail}`, {
        status: response.status,
        retryable: TRANSIENT_STATUS_CODES.has(response.status),
        fallbackAllowed: !NON_RETRYABLE_STATUS_CODES.has(response.status),
        retryAfter: retryAfterSeconds(response.headers),
      });
    }

    try {
      return JSON.parse(response.body) as Record<string, unknown>;
    } catch {
      throw new ProviderFailure('Gemini returned an invalid JSON envelope', { fallbackAllowed: true });
    }
  }

  private retryDelay(attempt: number, retryAfter: number | null): number {
    const exponential = Math.min(BACKOFF_CAP_SECONDS, BACKOFF_BASE_SECONDS * 2 ** (attempt - 1));
    const jittered = Math.min(BACKOFF_CAP_SECONDS, exponential + Math.max(0, this.jitter(exponential)));
    return Math.max(retryAfter ?? 0, jittered);
  }

  private async requestWithRetry(
    parts: Record<string, unknown>[],
    model: string,
    deadline: number,
  ): Promise<{ response: Record<string, unknown>; attempts: number }> {
    let attempts = 0;
    let lastFailure: ProviderFailure | null = null;

    while (attempts < this.maxAttempts) {
      const remaining = deadline - this.clock();
      if (remaining <= 0) {
        break;
      }
      attempts += 1;
      try {
        const response = await this.request(parts, model, Math.min(this.timeout, remaining));
        return { response, attempts };
      } catch (error) {
        if (!(error instanceof ProviderFailure)) {
          throw error;
        }
        lastFailure = error;
        if (!error.retryable || attempts >= this.maxAttempts) {
          break;
        }
        const delay = this.retryDelay(attempts, error.retryAfter);
        if (delay >= deadline - this.clock()) {
          break;
        }
        await this.sleep(delay);
      }
    }

    const failure = lastFailure ?? new ProviderFailure('Gemini retry wall-clock ceiling reached');
    failure.attempts = attempts;
    throw failure;
  }

  private buildParts(input: VisionInput, includeImage: boolean): Record<string, unknown>[] {
    const parts: Record<string, unknown>[] = [];
    const hasText = Boolean(input.text && input.text.trim());

    if (includeImage && input.imageBytes !== null) {
      parts.push(imagePart(input));
    } else if (!hasText) {
      throw new Error(
        'live Gemini provider requires image bytes or explicit text; sample_id is fixture-only',
      );
    }

    if (hasText) {
      parts.push({ text: (input.text as string).trim() });
    }
    parts.push({ text: 'List only the visible food items using the required JSON schema.' });
    return parts;
  }

  /** Call Gemini with bounded retries and explicit fallback metadata. */
  async perceive(input: VisionInput): Promise<VisionResult> {
    const hasImage = input.imageBytes !== null;
    let degraded = false;
    this.lastInput = input;
    this.lastItems = null;
    this.lastInputRef = new WeakRef(input);
    try {
    this.degraded = false;
    this.rung = RUNG_CONFIGURED_MODEL;
    this.lastModel = this.modelId;
    this.lastAttempts = 0;
    const started = this.clock();
    const deadline = started + this.maxElapsed;

    const rungChain: [string, string, boolean][] = [[RUNG_CONFIGURED_MODEL, this.model, true]];
    if (this.secondaryModel && this.secondaryModel !== this.model) {
      rungChain.push([RUNG_SECONDARY_MODEL, this.secondaryModel, true]);
    }
    if (hasImage && input.text && input.text.trim()) {
      rungChain.push([RUNG_TEXT_ONLY, this.secondaryModel ?? this.model, false]);
    }

    const failures: [string, string, ProviderFailure][] = [];
    let totalAttempts = 0;

    for (const [rung, model, includeImage] of rungChain) {
      if (this.clock() >= deadline) {
        break;
      }
      const parts = this.buildParts(input, includeImage);
      let attempts = 0;
      let items: PerceivedItem[];
      try {
        const outcome = await this.requestWithRetry(parts, model, deadline);
        attempts = outcome.attempts;
        items = parseItems(responseText(outcome.response));
      } catch (error) {
        if (error instanceof ProviderFailure) {
          totalAttempts += error.attempts;
          failures.push([rung, model, error]);
          if (!error.fallbackAllowed) {
            break;
          }
          continue;
        }
        totalAttempts += attempts;
        failures.push([
          rung,
          model,
          new ProviderFailure(error instanceof Error ? error.message : String(error), { attempts }),
        ]);
        continue;
      }

      totalAttempts += attempts;
      this.lastItems = items;
      this.lastModel = model;
      this.lastAttempts = totalAttempts;
      degraded = rung !== RUNG_CONFIGURED_MODEL;
      this.degraded = degraded;
      this.rung = rung;
      if (degraded) {
        this.onEvent('vision_fallback', { rung, model, attempts: totalAttempts });
      }
      return { observations: items, degraded };
    }

    const [lastRung, lastModel, lastFailure] =
      failures.length > 0
        ? failures[failures.length - 1]
        : ([RUNG_FAILURE, this.model, new ProviderFailure('Gemini retry wall-clock ceiling reached')] as [
            string,
            string,
            ProviderFailure,
          ]);

    degraded = true;
    this.degraded = degraded;
    this.rung = RUNG_FAILURE;
    this.lastModel = lastModel;
    this.lastAttempts = totalAttempts;
    const elapsedMs = Math.round((this.clock() - started) * 1000 * 100) / 100;
    this.onEvent('vision_provider_exhausted', {
      attempts: totalAttempts,
      terminal_status: lastFailure.status,
      elapsed_ms: elapsedMs,
      rung: lastRung,
    });
    const status = lastFailure.status ?? 'unknown';
    throw new Error(
      `Gemini provider exhausted after ${totalAttempts} attempt(s); ` +
        `terminal_status=${String(status)}; rung=${lastRung}: ${lastFailure.message}`,
    );
    } finally {
      this.lastInput = null;
    }
  }

  /**
   * Return safe, deterministic fixture data from a validated response.
   *
   * Neither the image nor the response envelope is included: a fixture records
   * validated observations only, which is what makes it safe to commit.
   */
  fixturePayload(input: VisionInput, items: PerceivedItem[]): FixturePayload {
    if (!input.fixtureKey) {
      throw new Error('fixture recording needs an image hash or sample_id');
    }
    return {
      _synthetic: false,
      sample_id: input.sampleId,
      input_sha256: input.contentHash,
      provider: this.name,
      model_id: this.lastModel,
      prompt_version: PROMPT_VERSION,
      degraded: this.degraded,
      rung: this.rung,
      attempts: this.lastAttempts,
      items: items.map((item) => {
        // Python writes `model_dump(exclude_none=True)`; a null optional is
        // omitted rather than serialised as null.
        const out: Record<string, unknown> = { surface_form: item.surface_form };
        if (item.cooking_method !== null) out.cooking_method = item.cooking_method;
        if (item.portion_hint !== null) out.portion_hint = item.portion_hint;
        out.confidence = item.confidence;
        if (item.ungrounded_kcal !== null) out.ungrounded_kcal = item.ungrounded_kcal;
        return out;
      }),
    };
  }

  /**
   * Persist last validated observations without the image or envelope.
   *
   * Written to a temporary file and renamed, so a fixture is never observed
   * half-written — the recorder can be interrupted without corrupting the
   * parity reference. Writing the same validated response twice produces a
   * byte-identical file, which is what makes re-running the recorder safe.
   */
  recordFixture(directory: string, input: VisionInput, path?: string): string {
    if (this.lastItems === null || this.lastInputRef?.deref() !== input) {
      throw new Error('record_fixture must follow a successful perceive call');
    }
    const key = input.fixtureKey;
    if (!key) {
      throw new Error('fixture recording needs an image hash or sample_id');
    }
    mkdirSync(directory, { recursive: true });
    const target = path ?? join(directory, `${key}.json`);
    mkdirSync(dirname(target), { recursive: true });

    const temporary = `${target.replace(/\.json$/, '')}.json.tmp`;
    writeFileSync(
      temporary,
      `${JSON.stringify(this.fixturePayload(input, this.lastItems), null, 2)}\n`,
      { encoding: 'utf-8' },
    );
    renameSync(temporary, target);
    return target;
  }
}
