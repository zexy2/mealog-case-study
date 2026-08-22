/**
 * Vision adapters: fixture replay and the live Gemini provider.
 *
 * Two properties decide this module and get the most attention here:
 *
 *  1. **The fixture adapter keys on the SHA-256 of the image bytes.** Not the
 *     filename, not `sample_id`. The sharpest form of that test is the
 *     negative one: when bytes are present and no fixture matches their hash,
 *     replay must fail even though a `sample_id` fixture is sitting right
 *     there. A fallback would let a mislabelled image replay someone else's
 *     recording and still look green.
 *
 *  2. **A provider response carrying a nutrition field is rejected**, not
 *     accepted with the field ignored. D1 says the vision stage never produces
 *     a nutrient number; if it starts, that has to surface as a failure.
 *
 * Everything runs offline. The Gemini adapter is driven through a stubbed
 * transport and is never called live; no test contains or needs a key.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { VisionInput } from '../src/pipeline/ports';
import { FIXTURE_DIR, FixtureVision } from '../src/adapters/vision.fixture';
import {
  ALLOWED_ITEM_FIELDS,
  DEFAULT_MODEL,
  FORBIDDEN_NUTRIENT_FIELDS,
  GeminiVision,
  MODEL_ENV_VAR,
  PROMPT_VERSION,
  REQUEST_INTERVAL_SECONDS,
  SECONDARY_MODEL,
  type Transport,
  type TransportResponse,
  configuredModelId,
  isSupportedImageBytes,
  parseObservationItems,
} from '../src/adapters/vision.gemini';

/** Obviously fake, low-entropy, and never sent anywhere. */
const FAKE_KEY = 'test-key';

const tempDirs: string[] = [];
function tempFixtureDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'mealog-fixtures-'));
  tempDirs.push(dir);
  return dir;
}
afterEach(() => {
  // Directories live under the OS temp dir; nothing is written to the repo.
  tempDirs.length = 0;
});

const sha256 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

function writeFixture(dir: string, key: string, items: unknown[], extra: object = {}): void {
  writeFileSync(
    join(dir, `${key}.json`),
    JSON.stringify({
      _synthetic: false,
      sample_id: 'sample_0001',
      provider: 'gemini',
      model_id: DEFAULT_MODEL,
      prompt_version: PROMPT_VERSION,
      ...extra,
      items,
    }),
  );
}

const OBSERVATION = {
  surface_form: 'kuru fasulye',
  cooking_method: 'stewed',
  portion_hint: 'one bowl',
  confidence: 0.9,
};

// Signature-only bytes are enough for the adapter boundary tests; no image is
// written to the repository or sent to a live provider.
const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
const asciiBytes = (value: string): number[] => [...value].map((character) => character.charCodeAt(0));
const ftypBytes = (brand: string): Uint8Array =>
  new Uint8Array([0, 0, 0, 16, ...asciiBytes('ftyp'), ...asciiBytes(brand), 0, 0, 0, 0]);

const IMAGE_SIGNATURE_CASES: [string, Uint8Array][] = [
  ['image/jpeg', JPEG_BYTES],
  ['image/jpg', JPEG_BYTES],
  ['image/png', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
  ['image/gif', new Uint8Array(asciiBytes('GIF89a'))],
  ['image/webp', new Uint8Array([...asciiBytes('RIFF'), 0, 0, 0, 0, ...asciiBytes('WEBP')])],
  ['image/avif', ftypBytes('avif')],
  ['image/heic', ftypBytes('heic')],
  ['image/heif', ftypBytes('mif1')],
];

/** A transport that returns a canned Gemini envelope and records its calls. */
function stubTransport(
  bodies: (string | TransportResponse)[],
): { transport: Transport; calls: { url: string; headers: Record<string, string>; body: string }[] } {
  const calls: { url: string; headers: Record<string, string>; body: string }[] = [];
  let index = 0;
  const transport: Transport = (request) => {
    calls.push({ url: request.url, headers: { ...request.headers }, body: request.body });
    const next = bodies[Math.min(index, bodies.length - 1)];
    index += 1;
    if (typeof next !== 'string') {
      return Promise.resolve(next);
    }
    return Promise.resolve({ status: 200, headers: {}, body: next });
  };
  return { transport, calls };
}

const envelope = (items: unknown[]): string =>
  JSON.stringify({
    candidates: [{ content: { parts: [{ text: JSON.stringify({ items }) }] } }],
  });

function gemini(overrides: Partial<ConstructorParameters<typeof GeminiVision>[0]> = {}) {
  return new GeminiVision({
    apiKey: FAKE_KEY,
    transport: stubTransport([envelope([OBSERVATION])]).transport,
    sleepFn: () => Promise.resolve(),
    clockFn: () => 0,
    jitterFn: () => 0,
    requestInterval: 0,
    env: {},
    ...overrides,
  });
}

// ============================================================ fixture lookup

describe('fixture adapter keys on the SHA-256 content hash', () => {
  it('resolves an image input by the hash of its bytes', () => {
    const dir = tempFixtureDir();
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    writeFixture(dir, sha256(bytes), [OBSERVATION]);

    const result = new FixtureVision(dir).perceive(
      new VisionInput({ imageBytes: bytes, imageMediaType: 'image/jpeg' }),
    );
    expect(result.observations).toHaveLength(1);
    expect(result.observations[0].surface_form).toBe('kuru fasulye');
  });

  it('does NOT fall back to sample_id when bytes are present', () => {
    // The decisive case. A fixture exists for this sample_id, and it must not
    // be used, because the bytes are what identify the photograph.
    const dir = tempFixtureDir();
    writeFixture(dir, 'sample_0001', [{ ...OBSERVATION, surface_form: 'WRONG RECORDING' }]);
    const bytes = new Uint8Array([9, 9, 9]);

    expect(() =>
      new FixtureVision(dir).perceive(
        new VisionInput({
          imageBytes: bytes,
          imageMediaType: 'image/jpeg',
          sampleId: 'sample_0001',
        }),
      ),
    ).toThrow(new RegExp(`no recorded response for '${sha256(bytes)}'`));
  });

  it('gives the same key for the same bytes regardless of sample_id', () => {
    const adapter = new FixtureVision(tempFixtureDir());
    const bytes = new Uint8Array([7, 7, 7]);
    const a = adapter.fixtureKeyFor(
      new VisionInput({ imageBytes: bytes, imageMediaType: 'image/png', sampleId: 'one' }),
    );
    const b = adapter.fixtureKeyFor(
      new VisionInput({ imageBytes: bytes, imageMediaType: 'image/png', sampleId: 'two' }),
    );
    expect(a).toBe(b);
    expect(a).toBe(sha256(bytes));
  });

  it('gives a different key for different bytes', () => {
    const adapter = new FixtureVision(tempFixtureDir());
    const key = (b: number[]) =>
      adapter.fixtureKeyFor(
        new VisionInput({ imageBytes: new Uint8Array(b), imageMediaType: 'image/png' }),
      );
    expect(key([1, 2, 3])).not.toBe(key([1, 2, 4]));
  });

  it('uses sample_id only when there are no bytes at all', () => {
    const dir = tempFixtureDir();
    writeFixture(dir, 'sample_0001', [OBSERVATION]);
    const adapter = new FixtureVision(dir);

    expect(adapter.perceive(new VisionInput({ sampleId: 'sample_0001' })).observations).toHaveLength(1);
    // The string form is the test-only convenience the Python module keeps.
    expect(adapter.perceive('sample_0001').observations).toHaveLength(1);
  });

  it('replays fixture degradation as request-scoped metadata', () => {
    const dir = tempFixtureDir();
    writeFixture(dir, 'degraded', [OBSERVATION], { degraded: true });

    const result = new FixtureVision(dir).perceive('degraded');

    expect(result.degraded).toBe(true);
    expect(result.observations).toHaveLength(1);
  });

  it('refuses an input that carries neither bytes nor a sample_id', () => {
    const adapter = new FixtureVision(tempFixtureDir());
    expect(() => adapter.perceive(new VisionInput({ text: 'pilav' }))).toThrow(
      /fixture replay needs image bytes or a sample_id/,
    );
  });

  it('points at the recording command when a fixture is missing', () => {
    const adapter = new FixtureVision(tempFixtureDir());
    expect(() => adapter.perceive('nope')).toThrow(/make eval-live/);
  });
});

describe('committed fixtures replay unchanged', () => {
  it('replays every fixture in eval/fixtures and matches the file contents', () => {
    const adapter = new FixtureVision();
    const names = readdirSync(FIXTURE_DIR).filter((n) => n.endsWith('.json'));
    expect(names.length).toBeGreaterThan(0);

    for (const name of names) {
      const key = name.replace(/\.json$/, '');
      const raw = JSON.parse(readFileSync(join(FIXTURE_DIR, name), 'utf-8')) as {
        items: Record<string, unknown>[];
      };
      const result = adapter.perceive(key);
      expect(result.degraded, name).toBe(false);
      expect(result.observations, name).toHaveLength(raw.items.length);
      result.observations.forEach((item, i) => {
        expect(item.surface_form, `${name}[${i}]`).toBe(raw.items[i].surface_form);
        expect(item.confidence, `${name}[${i}]`).toBe(raw.items[i].confidence ?? 0.5);
      });
    }
  });

  it('keeps the provenance stamps every fixture carries', () => {
    const names = readdirSync(FIXTURE_DIR).filter((n) => n.endsWith('.json'));
    for (const name of names) {
      const raw = JSON.parse(readFileSync(join(FIXTURE_DIR, name), 'utf-8')) as Record<string, unknown>;
      expect(raw._synthetic, name).toBe(false);
      expect(raw.provider, name).toBe('gemini');
      expect(typeof raw.model_id, name).toBe('string');
      expect(raw.prompt_version, name).toBe(PROMPT_VERSION);
    }
  });
});

// =================================================== D1 at the boundary

describe('a provider response carrying a nutrition field is rejected', () => {
  it('rejects the whole response, rather than ignoring the field', async () => {
    const { transport } = stubTransport([
      envelope([{ ...OBSERVATION, kcal: 240 }]),
    ]);
    const adapter = gemini({ transport, secondaryModel: null });

    // Not "returns an item without kcal" — the call fails.
    await expect(adapter.perceive(new VisionInput({ text: 'kuru fasulye' }))).rejects.toThrow(
      /forbidden nutrient field\(s\): kcal/,
    );
    expect(adapter.lastItems).toBeNull();
  });

  it.each([...FORBIDDEN_NUTRIENT_FIELDS].sort())('rejects a response carrying %s', (field) => {
    expect(() => parseObservationItems([{ ...OBSERVATION, [field]: 1 }])).toThrow(
      new RegExp(`forbidden nutrient field\\(s\\): ${field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
    );
  });

  it('names every forbidden field it found, sorted', () => {
    expect(() =>
      parseObservationItems([{ ...OBSERVATION, kcal: 1, grams: 2, food_id: 'x' }]),
    ).toThrow(/forbidden nutrient field\(s\): food_id, grams, kcal/);
  });

  it('reports a nutrition field as a D1 violation, not as a generic unknown field', () => {
    // Both checks would fire; the forbidden one has to win or the failure is
    // undiagnosable.
    expect(() => parseObservationItems([{ ...OBSERVATION, kcal: 1 }])).toThrow(/forbidden nutrient/);
    expect(() => parseObservationItems([{ ...OBSERVATION, plate_colour: 'blue' }])).toThrow(
      /unknown field\(s\): plate_colour/,
    );
  });

  it('rejects a tampered fixture too, since a fixture is a recorded response', () => {
    const dir = tempFixtureDir();
    writeFixture(dir, 'tampered', [{ ...OBSERVATION, kcal: 240 }]);
    expect(() => new FixtureVision(dir).perceive('tampered')).toThrow(
      /forbidden nutrient field\(s\): kcal/,
    );
  });

  it('still accepts a clean response, so the rejection is not blanket', () => {
    const items = parseObservationItems([OBSERVATION]);
    expect(items).toHaveLength(1);
    expect(items[0].surface_form).toBe('kuru fasulye');
    expect(Object.keys(OBSERVATION).every((k) => ALLOWED_ITEM_FIELDS.has(k))).toBe(true);
  });

  it('rejects an empty surface_form and an out-of-range confidence', () => {
    expect(() => parseObservationItems([{ ...OBSERVATION, surface_form: '  ' }])).toThrow(
      /empty surface_form/,
    );
    expect(() => parseObservationItems([{ ...OBSERVATION, confidence: 1.5 }])).toThrow(
      /confidence is outside \[0, 1\]/,
    );
  });
});

// ============================================================ Gemini adapter

describe('Gemini adapter', () => {
  it.each(IMAGE_SIGNATURE_CASES)('recognizes the %s content signature', (mimeType, bytes) => {
    expect(isSupportedImageBytes(mimeType, bytes)).toBe(true);
  });

  it('refuses to construct without a key', () => {
    expect(() => new GeminiVision({ apiKey: '   ' })).toThrow(/GEMINI_API_KEY is required/);
  });

  it('reads the model id from configuration and keeps it switchable', () => {
    // D10 records Lite for the golden set and full Flash for the comparison
    // strip, so the model must not be hardcoded.
    expect(configuredModelId({})).toBe(DEFAULT_MODEL);
    expect(configuredModelId({ [MODEL_ENV_VAR]: 'gemini-flash-latest' })).toBe('gemini-flash-latest');
    expect(configuredModelId({ [MODEL_ENV_VAR]: '   ' })).toBe(DEFAULT_MODEL);

    expect(gemini({ env: { [MODEL_ENV_VAR]: 'gemini-flash-latest' } }).modelId).toBe(
      'gemini-flash-latest',
    );
    expect(gemini({ modelId: 'explicit-model' }).modelId).toBe('explicit-model');
  });

  it('sends the key as a header and the schema in the body, to the configured model', async () => {
    const { transport, calls } = stubTransport([envelope([OBSERVATION])]);
    const adapter = gemini({ transport, modelId: 'gemini-flash-lite-latest' });
    await adapter.perceive(new VisionInput({ text: 'kuru fasulye' }));

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain('/models/gemini-flash-lite-latest:generateContent');
    expect(calls[0].headers['x-goog-api-key']).toBe(FAKE_KEY);
    // The key travels in the header, never in the URL or the body.
    expect(calls[0].url).not.toContain(FAKE_KEY);
    expect(calls[0].body).not.toContain(FAKE_KEY);
    const body = JSON.parse(calls[0].body) as { generationConfig: { responseMimeType: string } };
    expect(body.generationConfig.responseMimeType).toBe('application/json');
  });

  it('paces requests by the configured interval', async () => {
    let now = 0;
    const slept: number[] = [];
    const { transport } = stubTransport([envelope([OBSERVATION])]);
    const adapter = gemini({
      transport,
      requestInterval: REQUEST_INTERVAL_SECONDS,
      clockFn: () => now,
      sleepFn: (s) => {
        slept.push(s);
        now += s;
        return Promise.resolve();
      },
    });

    const input = new VisionInput({ text: 'pilav' });
    await adapter.perceive(input);
    await adapter.perceive(input);

    // The first call does not wait; the second waits out the interval.
    expect(slept).toEqual([REQUEST_INTERVAL_SECONDS]);
    expect(adapter.requestCount).toBe(2);
  });

  it('retries a transient status and then succeeds', async () => {
    const { transport, calls } = stubTransport([
      { status: 503, headers: {}, body: 'overloaded' },
      envelope([OBSERVATION]),
    ]);
    const adapter = gemini({ transport });
    const result = await adapter.perceive(new VisionInput({ text: 'pilav' }));
    expect(result.observations).toHaveLength(1);
    expect(result.degraded).toBe(false);
    expect(calls.length).toBeGreaterThanOrEqual(2);
    expect(adapter.degraded).toBe(false);
  });

  it('does not retry or fall back on a non-retryable status', async () => {
    const { transport, calls } = stubTransport([{ status: 400, headers: {}, body: 'bad request' }]);
    const adapter = gemini({ transport });
    await expect(adapter.perceive(new VisionInput({ text: 'pilav' }))).rejects.toThrow(
      /terminal_status=400/,
    );
    // One attempt, and the secondary-model rung is never tried.
    expect(calls).toHaveLength(1);
  });

  it('falls back to the secondary model and marks the result degraded', async () => {
    let call = 0;
    const transport: Transport = (request) => {
      call += 1;
      if (request.url.includes(encodeURIComponent(DEFAULT_MODEL))) {
        return Promise.resolve({ status: 500, headers: {}, body: 'boom' });
      }
      return Promise.resolve({ status: 200, headers: {}, body: envelope([OBSERVATION]) });
    };
    const adapter = gemini({ transport, modelId: DEFAULT_MODEL, secondaryModel: SECONDARY_MODEL });
    const result = await adapter.perceive(new VisionInput({ text: 'pilav' }));

    expect(result.observations).toHaveLength(1);
    expect(result.degraded).toBe(true);
    expect(adapter.degraded).toBe(true);
    expect(adapter.rung).toBe('secondary_model');
    expect(adapter.lastModel).toBe(SECONDARY_MODEL);
    expect(call).toBeGreaterThan(1);
  });

  it('emits an event when it degrades', async () => {
    const events: { name: string; fields: Record<string, unknown> }[] = [];
    const transport: Transport = (request) =>
      Promise.resolve(
        request.url.includes(encodeURIComponent(DEFAULT_MODEL))
          ? { status: 500, headers: {}, body: 'boom' }
          : { status: 200, headers: {}, body: envelope([OBSERVATION]) },
      );
    const adapter = gemini({
      transport,
      modelId: DEFAULT_MODEL,
      onEvent: (name, fields) => events.push({ name, fields }),
    });
    await adapter.perceive(new VisionInput({ text: 'pilav' }));
    expect(events.map((e) => e.name)).toContain('vision_fallback');
  });

  it('refuses a live call that carries only a sample_id', async () => {
    const adapter = gemini();
    await expect(adapter.perceive(new VisionInput({ sampleId: 'n5k_0001' }))).rejects.toThrow(
      /sample_id is fixture-only/,
    );
  });

  it('refuses an image MIME type outside the allow-list, and an oversized image', async () => {
    const { transport, calls } = stubTransport([envelope([OBSERVATION])]);
    const adapter = gemini({ transport });
    await expect(
      adapter.perceive(
        new VisionInput({ imageBytes: new Uint8Array([1]), imageMediaType: 'image/tiff' }),
      ),
    ).rejects.toThrow(/unsupported Gemini image MIME type/);

    await expect(
      adapter.perceive(
        new VisionInput({
          imageBytes: new Uint8Array(10 * 1024 * 1024 + 1),
          imageMediaType: 'image/jpeg',
        }),
      ),
    ).rejects.toThrow(/exceeds 10 MiB/);

    await expect(
      adapter.perceive(
        new VisionInput({ imageBytes: new Uint8Array([1, 2, 3, 4]), imageMediaType: 'image/jpeg' }),
      ),
    ).rejects.toThrow(/unsupported Gemini image content/);
    expect(calls).toHaveLength(0);
  });
});

// ========================================================= fixture recording

describe('fixture recording', () => {
  it('stamps provider, model_id, prompt_version and _synthetic: false', async () => {
    const adapter = gemini({ modelId: DEFAULT_MODEL });
    const input = new VisionInput({ text: 'kuru fasulye', sampleId: 'tr_9001' });
    const result = await adapter.perceive(input);

    const payload = adapter.fixturePayload(input, result.observations);
    expect(payload._synthetic).toBe(false);
    expect(payload.provider).toBe('gemini');
    expect(payload.model_id).toBe(DEFAULT_MODEL);
    expect(payload.prompt_version).toBe(PROMPT_VERSION);
    expect(payload.sample_id).toBe('tr_9001');
  });

  it('writes the file and is byte-identical when the same response is recorded twice', async () => {
    const dir = tempFixtureDir();
    const adapter = gemini({ modelId: DEFAULT_MODEL });
    const input = new VisionInput({ text: 'kuru fasulye', sampleId: 'tr_9002' });
    await adapter.perceive(input);

    const first = adapter.recordFixture(dir, input);
    const a = readFileSync(first, 'utf-8');
    const second = adapter.recordFixture(dir, input);
    const b = readFileSync(second, 'utf-8');

    expect(second).toBe(first);
    expect(b).toBe(a);
    expect(a.endsWith('\n')).toBe(true);
    // The temporary file is renamed, never left behind.
    expect(existsSync(first.replace(/\.json$/, '.json.tmp'))).toBe(false);
  });

  it('records neither the key, the image bytes, nor the response envelope', async () => {
    const dir = tempFixtureDir();
    const bytes = JPEG_BYTES;
    const adapter = gemini({ modelId: DEFAULT_MODEL });
    const input = new VisionInput({
      imageBytes: bytes,
      imageMediaType: 'image/jpeg',
      sampleId: 'tr_9003',
    });
    await adapter.perceive(input);

    const written = readFileSync(adapter.recordFixture(dir, input), 'utf-8');
    expect(written).not.toContain(FAKE_KEY);
    expect(written).not.toContain('x-goog-api-key');
    expect(written).not.toContain('candidates');
    expect(written).not.toContain(Buffer.from(bytes).toString('base64'));
    // Keyed on the content hash, so replay finds it by the photograph.
    expect(existsSync(join(dir, `${sha256(bytes)}.json`))).toBe(true);
    expect((JSON.parse(written) as { input_sha256: string }).input_sha256).toBe(sha256(bytes));
  });

  it('releases the strong request-input reference after perception and keeps recording usable', async () => {
    const dir = tempFixtureDir();
    const adapter = gemini({ modelId: DEFAULT_MODEL });
    const input = new VisionInput({ imageBytes: JPEG_BYTES, imageMediaType: 'image/jpeg' });

    await adapter.perceive(input);

    expect(adapter.lastInput).toBeNull();
    expect(adapter.recordFixture(dir, input)).toContain(`${sha256(JPEG_BYTES)}.json`);
  });

  it('refuses to record without a preceding successful perceive', () => {
    const adapter = gemini();
    expect(() => adapter.recordFixture(tempFixtureDir(), new VisionInput({ sampleId: 'x' }))).toThrow(
      /must follow a successful perceive/,
    );
  });

  it('round-trips: a recorded fixture replays to the same observations', async () => {
    const dir = tempFixtureDir();
    const adapter = gemini({ modelId: DEFAULT_MODEL });
    const input = new VisionInput({ text: 'kuru fasulye', sampleId: 'tr_9004' });
    const recorded = await adapter.perceive(input);
    adapter.recordFixture(dir, input);

    const replayed = new FixtureVision(dir).perceive('tr_9004');
    expect(replayed).toEqual(recorded);
  });
});
