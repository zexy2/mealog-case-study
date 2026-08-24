"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const vitest_1 = require("vitest");
const ports_1 = require("../src/pipeline/ports");
const vision_fixture_1 = require("../src/adapters/vision.fixture");
const vision_gemini_1 = require("../src/adapters/vision.gemini");
/** Obviously fake, low-entropy, and never sent anywhere. */
const FAKE_KEY = 'test-key';
const tempDirs = [];
function tempFixtureDir() {
    const dir = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), 'mealog-fixtures-'));
    tempDirs.push(dir);
    return dir;
}
(0, vitest_1.afterEach)(() => {
    // Directories live under the OS temp dir; nothing is written to the repo.
    tempDirs.length = 0;
});
const sha256 = (bytes) => (0, node_crypto_1.createHash)('sha256').update(bytes).digest('hex');
function writeFixture(dir, key, items, extra = {}) {
    (0, node_fs_1.writeFileSync)((0, node_path_1.join)(dir, `${key}.json`), JSON.stringify({
        _synthetic: false,
        sample_id: 'sample_0001',
        provider: 'gemini',
        model_id: vision_gemini_1.DEFAULT_MODEL,
        prompt_version: vision_gemini_1.PROMPT_VERSION,
        ...extra,
        items,
    }));
}
const OBSERVATION = {
    surface_form: 'kuru fasulye',
    cooking_method: 'stewed',
    portion_hint: 'one bowl',
    medium: 'real_plate',
    confidence: 0.9,
};
// Signature-only bytes are enough for the adapter boundary tests; no image is
// written to the repository or sent to a live provider.
const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
const asciiBytes = (value) => [...value].map((character) => character.charCodeAt(0));
const ftypBytes = (brand) => new Uint8Array([0, 0, 0, 16, ...asciiBytes('ftyp'), ...asciiBytes(brand), 0, 0, 0, 0]);
const IMAGE_SIGNATURE_CASES = [
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
function stubTransport(bodies) {
    const calls = [];
    let index = 0;
    const transport = (request) => {
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
const envelope = (items) => JSON.stringify({
    candidates: [{ content: { parts: [{ text: JSON.stringify({ items }) }] } }],
});
function gemini(overrides = {}) {
    return new vision_gemini_1.GeminiVision({
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
(0, vitest_1.describe)('fixture adapter keys on the SHA-256 content hash', () => {
    (0, vitest_1.it)('resolves an image input by the hash of its bytes', () => {
        const dir = tempFixtureDir();
        const bytes = new Uint8Array([1, 2, 3, 4, 5]);
        writeFixture(dir, sha256(bytes), [OBSERVATION]);
        const result = new vision_fixture_1.FixtureVision(dir).perceive(new ports_1.VisionInput({ imageBytes: bytes, imageMediaType: 'image/jpeg' }));
        (0, vitest_1.expect)(result.observations).toHaveLength(1);
        (0, vitest_1.expect)(result.observations[0].surface_form).toBe('kuru fasulye');
    });
    (0, vitest_1.it)('does NOT fall back to sample_id when bytes are present', () => {
        // The decisive case. A fixture exists for this sample_id, and it must not
        // be used, because the bytes are what identify the photograph.
        const dir = tempFixtureDir();
        writeFixture(dir, 'sample_0001', [{ ...OBSERVATION, surface_form: 'WRONG RECORDING' }]);
        const bytes = new Uint8Array([9, 9, 9]);
        (0, vitest_1.expect)(() => new vision_fixture_1.FixtureVision(dir).perceive(new ports_1.VisionInput({
            imageBytes: bytes,
            imageMediaType: 'image/jpeg',
            sampleId: 'sample_0001',
        }))).toThrow(new RegExp(`no recorded response for '${sha256(bytes)}'`));
    });
    (0, vitest_1.it)('gives the same key for the same bytes regardless of sample_id', () => {
        const adapter = new vision_fixture_1.FixtureVision(tempFixtureDir());
        const bytes = new Uint8Array([7, 7, 7]);
        const a = adapter.fixtureKeyFor(new ports_1.VisionInput({ imageBytes: bytes, imageMediaType: 'image/png', sampleId: 'one' }));
        const b = adapter.fixtureKeyFor(new ports_1.VisionInput({ imageBytes: bytes, imageMediaType: 'image/png', sampleId: 'two' }));
        (0, vitest_1.expect)(a).toBe(b);
        (0, vitest_1.expect)(a).toBe(sha256(bytes));
    });
    (0, vitest_1.it)('gives a different key for different bytes', () => {
        const adapter = new vision_fixture_1.FixtureVision(tempFixtureDir());
        const key = (b) => adapter.fixtureKeyFor(new ports_1.VisionInput({ imageBytes: new Uint8Array(b), imageMediaType: 'image/png' }));
        (0, vitest_1.expect)(key([1, 2, 3])).not.toBe(key([1, 2, 4]));
    });
    (0, vitest_1.it)('uses sample_id only when there are no bytes at all', () => {
        const dir = tempFixtureDir();
        writeFixture(dir, 'sample_0001', [OBSERVATION]);
        const adapter = new vision_fixture_1.FixtureVision(dir);
        (0, vitest_1.expect)(adapter.perceive(new ports_1.VisionInput({ sampleId: 'sample_0001' })).observations).toHaveLength(1);
        // The string form is the test-only convenience the Python module keeps.
        (0, vitest_1.expect)(adapter.perceive('sample_0001').observations).toHaveLength(1);
    });
    (0, vitest_1.it)('replays fixture degradation as request-scoped metadata', () => {
        const dir = tempFixtureDir();
        writeFixture(dir, 'degraded', [OBSERVATION], { degraded: true });
        const result = new vision_fixture_1.FixtureVision(dir).perceive('degraded');
        (0, vitest_1.expect)(result.degraded).toBe(true);
        (0, vitest_1.expect)(result.observations).toHaveLength(1);
    });
    (0, vitest_1.it)('refuses an input that carries neither bytes nor a sample_id', () => {
        const adapter = new vision_fixture_1.FixtureVision(tempFixtureDir());
        (0, vitest_1.expect)(() => adapter.perceive(new ports_1.VisionInput({ text: 'pilav' }))).toThrow(/fixture replay needs image bytes or a sample_id/);
    });
    (0, vitest_1.it)('points at the recording command when a fixture is missing', () => {
        const adapter = new vision_fixture_1.FixtureVision(tempFixtureDir());
        (0, vitest_1.expect)(() => adapter.perceive('nope')).toThrow(/make eval-live/);
    });
});
(0, vitest_1.describe)('committed fixtures replay unchanged', () => {
    (0, vitest_1.it)('replays every fixture in eval/fixtures and matches the file contents', () => {
        const adapter = new vision_fixture_1.FixtureVision();
        const names = (0, node_fs_1.readdirSync)(vision_fixture_1.FIXTURE_DIR).filter((n) => n.endsWith('.json'));
        (0, vitest_1.expect)(names.length).toBeGreaterThan(0);
        for (const name of names) {
            const key = name.replace(/\.json$/, '');
            const raw = JSON.parse((0, node_fs_1.readFileSync)((0, node_path_1.join)(vision_fixture_1.FIXTURE_DIR, name), 'utf-8'));
            const result = adapter.perceive(key);
            (0, vitest_1.expect)(result.degraded, name).toBe(false);
            (0, vitest_1.expect)(result.observations, name).toHaveLength(raw.items.length);
            result.observations.forEach((item, i) => {
                (0, vitest_1.expect)(item.surface_form, `${name}[${i}]`).toBe(raw.items[i].surface_form);
                (0, vitest_1.expect)(item.confidence, `${name}[${i}]`).toBe(raw.items[i].confidence ?? 0.5);
            });
        }
    });
    (0, vitest_1.it)('keeps the provenance stamps every fixture carries', () => {
        const names = (0, node_fs_1.readdirSync)(vision_fixture_1.FIXTURE_DIR).filter((n) => n.endsWith('.json'));
        for (const name of names) {
            const raw = JSON.parse((0, node_fs_1.readFileSync)((0, node_path_1.join)(vision_fixture_1.FIXTURE_DIR, name), 'utf-8'));
            (0, vitest_1.expect)(raw._synthetic, name).toBe(false);
            (0, vitest_1.expect)(raw.provider, name).toBe('gemini');
            (0, vitest_1.expect)(typeof raw.model_id, name).toBe('string');
            // Committed fixtures remain p3 by design; p4 applies only to new live
            // responses because this change must not re-record the golden set.
            (0, vitest_1.expect)(raw.prompt_version, name).toBe('p3');
        }
    });
});
// =================================================== D1 at the boundary
(0, vitest_1.describe)('a provider response carrying a nutrition field is rejected', () => {
    (0, vitest_1.it)('rejects the whole response, rather than ignoring the field', async () => {
        const { transport } = stubTransport([
            envelope([{ ...OBSERVATION, kcal: 240 }]),
        ]);
        const adapter = gemini({ transport, secondaryModel: null });
        // Not "returns an item without kcal" — the call fails.
        await (0, vitest_1.expect)(adapter.perceive(new ports_1.VisionInput({ text: 'kuru fasulye' }))).rejects.toThrow(/forbidden nutrient field\(s\): kcal/);
        (0, vitest_1.expect)(adapter.lastItems).toBeNull();
    });
    vitest_1.it.each([...vision_gemini_1.FORBIDDEN_NUTRIENT_FIELDS].sort())('rejects a response carrying %s', (field) => {
        (0, vitest_1.expect)(() => (0, vision_gemini_1.parseObservationItems)([{ ...OBSERVATION, [field]: 1 }])).toThrow(new RegExp(`forbidden nutrient field\\(s\\): ${field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    });
    (0, vitest_1.it)('names every forbidden field it found, sorted', () => {
        (0, vitest_1.expect)(() => (0, vision_gemini_1.parseObservationItems)([{ ...OBSERVATION, kcal: 1, grams: 2, food_id: 'x' }])).toThrow(/forbidden nutrient field\(s\): food_id, grams, kcal/);
    });
    (0, vitest_1.it)('reports a nutrition field as a D1 violation, not as a generic unknown field', () => {
        // Both checks would fire; the forbidden one has to win or the failure is
        // undiagnosable.
        (0, vitest_1.expect)(() => (0, vision_gemini_1.parseObservationItems)([{ ...OBSERVATION, kcal: 1 }])).toThrow(/forbidden nutrient/);
        (0, vitest_1.expect)(() => (0, vision_gemini_1.parseObservationItems)([{ ...OBSERVATION, plate_colour: 'blue' }])).toThrow(/unknown field\(s\): plate_colour/);
    });
    (0, vitest_1.it)('rejects a tampered fixture too, since a fixture is a recorded response', () => {
        const dir = tempFixtureDir();
        writeFixture(dir, 'tampered', [{ ...OBSERVATION, kcal: 240 }]);
        (0, vitest_1.expect)(() => new vision_fixture_1.FixtureVision(dir).perceive('tampered')).toThrow(/forbidden nutrient field\(s\): kcal/);
    });
    (0, vitest_1.it)('still accepts a clean response, so the rejection is not blanket', () => {
        const items = (0, vision_gemini_1.parseObservationItems)([OBSERVATION]);
        (0, vitest_1.expect)(items).toHaveLength(1);
        (0, vitest_1.expect)(items[0].surface_form).toBe('kuru fasulye');
        (0, vitest_1.expect)(Object.keys(OBSERVATION).every((k) => vision_gemini_1.ALLOWED_ITEM_FIELDS.has(k))).toBe(true);
    });
    vitest_1.it.each(['real_plate', 'screen', 'printed', 'toy_or_model', 'unclear'])('preserves the %s capture medium', (medium) => {
        (0, vitest_1.expect)((0, vision_gemini_1.parseObservationItems)([{ ...OBSERVATION, medium }])[0].capture_medium).toBe(medium);
    });
    (0, vitest_1.it)('requires medium on live-shaped responses', () => {
        const legacyObservation = { ...OBSERVATION };
        delete legacyObservation.medium;
        (0, vitest_1.expect)(() => (0, vision_gemini_1.parseObservationItems)([legacyObservation])).toThrow(/medium must be one of/);
    });
    (0, vitest_1.it)('defaults a legacy fixture missing medium to neutral real_plate', () => {
        const dir = tempFixtureDir();
        const legacyObservation = { ...OBSERVATION };
        delete legacyObservation.medium;
        writeFixture(dir, 'legacy-medium', [legacyObservation]);
        (0, vitest_1.expect)(new vision_fixture_1.FixtureVision(dir).perceive('legacy-medium').observations[0].capture_medium).toBe('real_plate');
    });
    (0, vitest_1.it)('accepts nullable positive integer counts and rejects guessed decimals', () => {
        const counted = (0, vision_gemini_1.parseObservationItems)([
            { ...OBSERVATION, portion_hint: 'whole', count: 2 },
        ], 'Gemini', 'vision');
        (0, vitest_1.expect)(counted[0]).toMatchObject({ count: 2, count_origin: 'vision' });
        (0, vitest_1.expect)((0, vision_gemini_1.parseObservationItems)([{ ...OBSERVATION, count: 1 }], 'Gemini', 'vision')[0].count).toBeNull();
        (0, vitest_1.expect)((0, vision_gemini_1.parseObservationItems)([{ ...OBSERVATION, count: 4 }], 'Gemini', 'vision')[0].count).toBeNull();
        (0, vitest_1.expect)((0, vision_gemini_1.parseObservationItems)([{ ...OBSERVATION, count: null }])[0].count).toBeNull();
        (0, vitest_1.expect)(() => (0, vision_gemini_1.parseObservationItems)([{ ...OBSERVATION, count: 1.5 }])).toThrow(/count must be a positive integer or null/);
    });
    (0, vitest_1.it)('rejects an empty surface_form and an out-of-range confidence', () => {
        (0, vitest_1.expect)(() => (0, vision_gemini_1.parseObservationItems)([{ ...OBSERVATION, surface_form: '  ' }])).toThrow(/empty surface_form/);
        (0, vitest_1.expect)(() => (0, vision_gemini_1.parseObservationItems)([{ ...OBSERVATION, confidence: 1.5 }])).toThrow(/confidence is outside \[0, 1\]/);
    });
});
// ============================================================ Gemini adapter
(0, vitest_1.describe)('Gemini adapter', () => {
    vitest_1.it.each(IMAGE_SIGNATURE_CASES)('recognizes the %s content signature', (mimeType, bytes) => {
        (0, vitest_1.expect)((0, vision_gemini_1.isSupportedImageBytes)(mimeType, bytes)).toBe(true);
    });
    (0, vitest_1.it)('refuses to construct without a key', () => {
        (0, vitest_1.expect)(() => new vision_gemini_1.GeminiVision({ apiKey: '   ' })).toThrow(/GEMINI_API_KEY is required/);
    });
    (0, vitest_1.it)('reads the model id from configuration and keeps it switchable', () => {
        // D10 records Lite for the golden set and full Flash for the comparison
        // strip, so the model must not be hardcoded.
        (0, vitest_1.expect)((0, vision_gemini_1.configuredModelId)({})).toBe(vision_gemini_1.DEFAULT_MODEL);
        (0, vitest_1.expect)((0, vision_gemini_1.configuredModelId)({ [vision_gemini_1.MODEL_ENV_VAR]: 'gemini-flash-latest' })).toBe('gemini-flash-latest');
        (0, vitest_1.expect)((0, vision_gemini_1.configuredModelId)({ [vision_gemini_1.MODEL_ENV_VAR]: '   ' })).toBe(vision_gemini_1.DEFAULT_MODEL);
        (0, vitest_1.expect)(gemini({ env: { [vision_gemini_1.MODEL_ENV_VAR]: 'gemini-flash-latest' } }).modelId).toBe('gemini-flash-latest');
        (0, vitest_1.expect)(gemini({ modelId: 'explicit-model' }).modelId).toBe('explicit-model');
    });
    (0, vitest_1.it)('sends the key as a header and the schema in the body, to the configured model', async () => {
        const { transport, calls } = stubTransport([envelope([OBSERVATION])]);
        const adapter = gemini({ transport, modelId: 'gemini-flash-lite-latest' });
        await adapter.perceive(new ports_1.VisionInput({ text: 'kuru fasulye' }));
        (0, vitest_1.expect)(calls).toHaveLength(1);
        (0, vitest_1.expect)(calls[0].url).toContain('/models/gemini-flash-lite-latest:generateContent');
        (0, vitest_1.expect)(calls[0].headers['x-goog-api-key']).toBe(FAKE_KEY);
        // The key travels in the header, never in the URL or the body.
        (0, vitest_1.expect)(calls[0].url).not.toContain(FAKE_KEY);
        (0, vitest_1.expect)(calls[0].body).not.toContain(FAKE_KEY);
        const body = JSON.parse(calls[0].body);
        (0, vitest_1.expect)(body.generationConfig.responseMimeType).toBe('application/json');
    });
    (0, vitest_1.it)('paces requests by the configured interval', async () => {
        let now = 0;
        const slept = [];
        const { transport } = stubTransport([envelope([OBSERVATION])]);
        const adapter = gemini({
            transport,
            requestInterval: vision_gemini_1.REQUEST_INTERVAL_SECONDS,
            clockFn: () => now,
            sleepFn: (s) => {
                slept.push(s);
                now += s;
                return Promise.resolve();
            },
        });
        const input = new ports_1.VisionInput({ text: 'pilav' });
        await adapter.perceive(input);
        await adapter.perceive(input);
        // The first call does not wait; the second waits out the interval.
        (0, vitest_1.expect)(slept).toEqual([vision_gemini_1.REQUEST_INTERVAL_SECONDS]);
        (0, vitest_1.expect)(adapter.requestCount).toBe(2);
    });
    (0, vitest_1.it)('retries a transient status and then succeeds', async () => {
        const { transport, calls } = stubTransport([
            { status: 503, headers: {}, body: 'overloaded' },
            envelope([OBSERVATION]),
        ]);
        const adapter = gemini({ transport });
        const result = await adapter.perceive(new ports_1.VisionInput({ text: 'pilav' }));
        (0, vitest_1.expect)(result.observations).toHaveLength(1);
        (0, vitest_1.expect)(result.degraded).toBe(false);
        (0, vitest_1.expect)(calls.length).toBeGreaterThanOrEqual(2);
        (0, vitest_1.expect)(adapter.degraded).toBe(false);
    });
    (0, vitest_1.it)('does not retry or fall back on a non-retryable status', async () => {
        const { transport, calls } = stubTransport([{ status: 400, headers: {}, body: 'bad request' }]);
        const adapter = gemini({ transport });
        await (0, vitest_1.expect)(adapter.perceive(new ports_1.VisionInput({ text: 'pilav' }))).rejects.toThrow(/terminal_status=400/);
        // One attempt, and the secondary-model rung is never tried.
        (0, vitest_1.expect)(calls).toHaveLength(1);
    });
    (0, vitest_1.it)('falls back to the secondary model and marks the result degraded', async () => {
        let call = 0;
        const transport = (request) => {
            call += 1;
            if (request.url.includes(encodeURIComponent(vision_gemini_1.DEFAULT_MODEL))) {
                return Promise.resolve({ status: 500, headers: {}, body: 'boom' });
            }
            return Promise.resolve({ status: 200, headers: {}, body: envelope([OBSERVATION]) });
        };
        const adapter = gemini({ transport, modelId: vision_gemini_1.DEFAULT_MODEL, secondaryModel: vision_gemini_1.SECONDARY_MODEL });
        const result = await adapter.perceive(new ports_1.VisionInput({ text: 'pilav' }));
        (0, vitest_1.expect)(result.observations).toHaveLength(1);
        (0, vitest_1.expect)(result.degraded).toBe(true);
        (0, vitest_1.expect)(adapter.degraded).toBe(true);
        (0, vitest_1.expect)(adapter.rung).toBe('secondary_model');
        (0, vitest_1.expect)(adapter.lastModel).toBe(vision_gemini_1.SECONDARY_MODEL);
        (0, vitest_1.expect)(call).toBeGreaterThan(1);
    });
    (0, vitest_1.it)('classifies an exhausted timeout and logs only safe retry metadata', async () => {
        const events = [];
        const transport = () => {
            const timeout = new Error('provider timeout payload must not be logged');
            timeout.name = 'TimeoutError';
            return Promise.reject(timeout);
        };
        const adapter = gemini({
            transport,
            secondaryModel: null,
            maxAttempts: 2,
            requestInterval: 0,
            onEvent: (name, fields) => events.push({ name, fields }),
        });
        const error = await adapter.perceive(new ports_1.VisionInput({ text: 'pilav' })).then(() => null, (caught) => caught);
        (0, vitest_1.expect)(error).toBeInstanceOf(vision_gemini_1.VisionProviderError);
        (0, vitest_1.expect)(error).toMatchObject({
            name: 'VisionProviderError',
            category: 'provider_timeout',
            attempts: 2,
            message: 'vision provider timeout',
        });
        const exhausted = events.find((event) => event.name === 'vision_provider_exhausted');
        (0, vitest_1.expect)(exhausted?.fields).toMatchObject({
            category: 'provider_timeout',
            retry_attempted: true,
            attempts: 2,
        });
        (0, vitest_1.expect)(JSON.stringify(exhausted?.fields)).not.toContain('provider timeout payload');
    });
    (0, vitest_1.it)('emits an event when it degrades', async () => {
        const events = [];
        const transport = (request) => Promise.resolve(request.url.includes(encodeURIComponent(vision_gemini_1.DEFAULT_MODEL))
            ? { status: 500, headers: {}, body: 'boom' }
            : { status: 200, headers: {}, body: envelope([OBSERVATION]) });
        const adapter = gemini({
            transport,
            modelId: vision_gemini_1.DEFAULT_MODEL,
            onEvent: (name, fields) => events.push({ name, fields }),
        });
        await adapter.perceive(new ports_1.VisionInput({ text: 'pilav' }));
        (0, vitest_1.expect)(events.map((e) => e.name)).toContain('vision_fallback');
    });
    (0, vitest_1.it)('refuses a live call that carries only a sample_id', async () => {
        const adapter = gemini();
        await (0, vitest_1.expect)(adapter.perceive(new ports_1.VisionInput({ sampleId: 'n5k_0001' }))).rejects.toThrow(/sample_id is fixture-only/);
    });
    (0, vitest_1.it)('refuses an image MIME type outside the allow-list, and an oversized image', async () => {
        const { transport, calls } = stubTransport([envelope([OBSERVATION])]);
        const adapter = gemini({ transport });
        await (0, vitest_1.expect)(adapter.perceive(new ports_1.VisionInput({ imageBytes: new Uint8Array([1]), imageMediaType: 'image/tiff' }))).rejects.toThrow(/unsupported Gemini image MIME type/);
        await (0, vitest_1.expect)(adapter.perceive(new ports_1.VisionInput({
            imageBytes: new Uint8Array(10 * 1024 * 1024 + 1),
            imageMediaType: 'image/jpeg',
        }))).rejects.toThrow(/exceeds 10 MiB/);
        await (0, vitest_1.expect)(adapter.perceive(new ports_1.VisionInput({ imageBytes: new Uint8Array([1, 2, 3, 4]), imageMediaType: 'image/jpeg' }))).rejects.toThrow(/unsupported Gemini image content/);
        (0, vitest_1.expect)(calls).toHaveLength(0);
    });
});
// ========================================================= fixture recording
(0, vitest_1.describe)('fixture recording', () => {
    (0, vitest_1.it)('stamps provider, model_id, prompt_version and _synthetic: false', async () => {
        const adapter = gemini({ modelId: vision_gemini_1.DEFAULT_MODEL });
        const input = new ports_1.VisionInput({ text: 'kuru fasulye', sampleId: 'tr_9001' });
        const result = await adapter.perceive(input);
        const payload = adapter.fixturePayload(input, result.observations);
        (0, vitest_1.expect)(payload._synthetic).toBe(false);
        (0, vitest_1.expect)(payload.provider).toBe('gemini');
        (0, vitest_1.expect)(payload.model_id).toBe(vision_gemini_1.DEFAULT_MODEL);
        (0, vitest_1.expect)(payload.prompt_version).toBe(vision_gemini_1.PROMPT_VERSION);
        (0, vitest_1.expect)(payload.sample_id).toBe('tr_9001');
    });
    (0, vitest_1.it)('writes the file and is byte-identical when the same response is recorded twice', async () => {
        const dir = tempFixtureDir();
        const adapter = gemini({ modelId: vision_gemini_1.DEFAULT_MODEL });
        const input = new ports_1.VisionInput({ text: 'kuru fasulye', sampleId: 'tr_9002' });
        await adapter.perceive(input);
        const first = adapter.recordFixture(dir, input);
        const a = (0, node_fs_1.readFileSync)(first, 'utf-8');
        const second = adapter.recordFixture(dir, input);
        const b = (0, node_fs_1.readFileSync)(second, 'utf-8');
        (0, vitest_1.expect)(second).toBe(first);
        (0, vitest_1.expect)(b).toBe(a);
        (0, vitest_1.expect)(a.endsWith('\n')).toBe(true);
        // The temporary file is renamed, never left behind.
        (0, vitest_1.expect)((0, node_fs_1.existsSync)(first.replace(/\.json$/, '.json.tmp'))).toBe(false);
    });
    (0, vitest_1.it)('records neither the key, the image bytes, nor the response envelope', async () => {
        const dir = tempFixtureDir();
        const bytes = JPEG_BYTES;
        const adapter = gemini({ modelId: vision_gemini_1.DEFAULT_MODEL });
        const input = new ports_1.VisionInput({
            imageBytes: bytes,
            imageMediaType: 'image/jpeg',
            sampleId: 'tr_9003',
        });
        await adapter.perceive(input);
        const written = (0, node_fs_1.readFileSync)(adapter.recordFixture(dir, input), 'utf-8');
        (0, vitest_1.expect)(written).not.toContain(FAKE_KEY);
        (0, vitest_1.expect)(written).not.toContain('x-goog-api-key');
        (0, vitest_1.expect)(written).not.toContain('candidates');
        (0, vitest_1.expect)(written).not.toContain(Buffer.from(bytes).toString('base64'));
        // Keyed on the content hash, so replay finds it by the photograph.
        (0, vitest_1.expect)((0, node_fs_1.existsSync)((0, node_path_1.join)(dir, `${sha256(bytes)}.json`))).toBe(true);
        (0, vitest_1.expect)(JSON.parse(written).input_sha256).toBe(sha256(bytes));
    });
    (0, vitest_1.it)('releases the strong request-input reference after perception and keeps recording usable', async () => {
        const dir = tempFixtureDir();
        const adapter = gemini({ modelId: vision_gemini_1.DEFAULT_MODEL });
        const input = new ports_1.VisionInput({ imageBytes: JPEG_BYTES, imageMediaType: 'image/jpeg' });
        await adapter.perceive(input);
        (0, vitest_1.expect)(adapter.lastInput).toBeNull();
        (0, vitest_1.expect)(adapter.recordFixture(dir, input)).toContain(`${sha256(JPEG_BYTES)}.json`);
    });
    (0, vitest_1.it)('refuses to record without a preceding successful perceive', () => {
        const adapter = gemini();
        (0, vitest_1.expect)(() => adapter.recordFixture(tempFixtureDir(), new ports_1.VisionInput({ sampleId: 'x' }))).toThrow(/must follow a successful perceive/);
    });
    (0, vitest_1.it)('round-trips: a recorded fixture replays to the same observations', async () => {
        const dir = tempFixtureDir();
        const adapter = gemini({ modelId: vision_gemini_1.DEFAULT_MODEL });
        const input = new ports_1.VisionInput({ text: 'kuru fasulye', sampleId: 'tr_9004' });
        const recorded = await adapter.perceive(input);
        adapter.recordFixture(dir, input);
        const replayed = new vision_fixture_1.FixtureVision(dir).perceive('tr_9004');
        (0, vitest_1.expect)(replayed).toEqual(recorded);
    });
});
//# sourceMappingURL=adapters.vision.test.js.map