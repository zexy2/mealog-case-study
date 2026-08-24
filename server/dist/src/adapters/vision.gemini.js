"use strict";
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
 * key would silently invalidate the 80 recorded fixtures, which are the parity
 * reference for the whole port.
 *
 * This module is framework-agnostic by rule: an adapter is a port
 * implementation, not an edge concern, so `src/adapters/` sits under the same
 * no-framework invariant as `src/pipeline/` and `scripts/check_invariants.py`
 * fails the build if one appears.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiVision = exports.VisionProviderError = exports.ProviderFailure = exports.ALLOWED_IMAGE_MIME_TYPES = exports.ALLOWED_ITEM_FIELDS = exports.FORBIDDEN_NUTRIENT_FIELDS = exports.RESPONSE_SCHEMA = exports.SYSTEM_PROMPT = exports.RUNG_FAILURE = exports.RUNG_TEXT_ONLY = exports.RUNG_SECONDARY_MODEL = exports.RUNG_CONFIGURED_MODEL = exports.BACKOFF_CAP_SECONDS = exports.BACKOFF_BASE_SECONDS = exports.MAX_ELAPSED_SECONDS = exports.MAX_ATTEMPTS = exports.NON_RETRYABLE_STATUS_CODES = exports.TRANSIENT_STATUS_CODES = exports.MAX_ERROR_BODY = exports.API_ROOT = exports.REQUEST_INTERVAL_SECONDS = exports.MODEL_ENV_VAR = exports.SECONDARY_MODEL = exports.DEFAULT_MODEL = exports.PROMPT_VERSION = void 0;
exports.isSupportedImageBytes = isSupportedImageBytes;
exports.configuredModelId = configuredModelId;
exports.retryAfterSeconds = retryAfterSeconds;
exports.isTimeoutError = isTimeoutError;
exports.imagePart = imagePart;
exports.responseText = responseText;
exports.parseObservationItems = parseObservationItems;
exports.parseItems = parseItems;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const models_1 = require("../domain/models");
exports.PROMPT_VERSION = 'p4';
exports.DEFAULT_MODEL = 'gemini-flash-lite-latest';
exports.SECONDARY_MODEL = 'gemini-2.5-flash-lite';
exports.MODEL_ENV_VAR = 'GEMINI_MODEL';
exports.REQUEST_INTERVAL_SECONDS = 4.0;
exports.API_ROOT = 'https://generativelanguage.googleapis.com/v1beta';
exports.MAX_ERROR_BODY = 500;
exports.TRANSIENT_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
exports.NON_RETRYABLE_STATUS_CODES = new Set([400, 401]);
exports.MAX_ATTEMPTS = 3;
exports.MAX_ELAPSED_SECONDS = 30.0;
exports.BACKOFF_BASE_SECONDS = 0.25;
exports.BACKOFF_CAP_SECONDS = 2.0;
exports.RUNG_CONFIGURED_MODEL = 'configured_model';
exports.RUNG_SECONDARY_MODEL = 'secondary_model';
exports.RUNG_TEXT_ONLY = 'text_only';
exports.RUNG_FAILURE = 'failure';
exports.SYSTEM_PROMPT = `You list what food is visible in the supplied image or text.
Return observed items only. You do NOT estimate calories, macros, nutrients, or
grams. The downstream catalogue and nutrition stages handle those values.

Rules:
- Name dishes in the language on the plate's origin if you recognise it.
- If unsure between two dishes, return the more general one and lower confidence.
- Never invent an item you cannot see. Omission is cheaper than invention.
- Strict Admissibility Gates:
  * If the image is blurry, out of focus, motion-blurred, or unrecognizable, do NOT guess dishes (e.g. do not guess pie, soup, or bread). Return empty items: [].
  * If the image shows plastic toy food, fake miniature models, decorative replicas, or inedible synthetic items, do NOT treat them as food. Return empty items: [].
  * If the image depicts a smartphone/digital screen, laptop monitor, or printed photograph displaying a picture of food rather than real food in person, do NOT extract the meal on the screen. Return empty items: [].
  * If the plate or table is empty (no food present), return empty items: [].
- Set \`count\` only when items are individually countable and every instance is
  distinctly visible. Overlapping, stacked, cropped, or occluded instances must
  return \`count: null\`; never guess. Two stacked simit rings are an occluded
  arrangement: return \`count: null\` even if two rings appear recognisable.
- On a plate or meal with multiple distinct edible components (such as meat/fish alongside side vegetables, potatoes, rice, salad, bread, or drink), report each distinct edible food component as an item in the items list.
- Never count liquid volume, pixels, or a serving container as multiple food instances. Do not report non-food objects (cutlery, wallet, receipt, table), inedible garnish, decorative leaves, or unidentifiable background as separate food items. Do not add ABSTAIN or other placeholder items.


- \`count\` is the only count field. Keep \`portion_hint\` non-numeric: use a
  qualitative description such as \`whole\`, \`bowl\`, or \`stacked\`, never a
  count, gram estimate, or numeric serving estimate.
- Set \`medium\` to exactly one of \`real_plate\`, \`screen\`, \`printed\`,
  \`toy_or_model\`, or \`unclear\` for every observed item. Use \`screen\` for food
  shown inside a display, \`printed\` for paper, packaging, or other printed
  imagery, and \`toy_or_model\` for a toy, miniature, moulded replica, or
  obviously synthetic food. Use \`real_plate\` only for a real serving
  photographed directly. If you cannot tell, or the image is torn between a
  real serving and another medium, use \`unclear\`. \`real_plate\` is neutral
  evidence, never positive evidence.
`;
exports.RESPONSE_SCHEMA = {
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
                    count: {
                        type: 'INTEGER',
                        nullable: true,
                        minimum: 1,
                        description: 'Count only when each individually countable instance is distinctly visible; otherwise null.',
                    },
                    medium: {
                        type: 'STRING',
                        enum: ['real_plate', 'screen', 'printed', 'toy_or_model', 'unclear'],
                        description: 'Capture medium; real_plate is neutral, every other value is a safety red flag.',
                    },
                    confidence: {
                        type: 'NUMBER',
                        minimum: 0,
                        maximum: 1,
                        description: 'Confidence that this item is present, from 0 to 1.',
                    },
                },
                required: ['surface_form', 'cooking_method', 'portion_hint', 'count', 'medium', 'confidence'],
            },
        },
    },
    required: ['items'],
};
/**
 * D1, enforced rather than trusted.
 *
 * The vision stage returns *references*, never numbers. A response carrying any
 * of these is a provider that has started guessing nutrition, and the correct
 * response is to reject the whole response — not to drop the field and carry
 * on, which would hide exactly the failure the architecture claims is
 * impossible.
 */
exports.FORBIDDEN_NUTRIENT_FIELDS = new Set([
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
exports.ALLOWED_ITEM_FIELDS = new Set(Object.keys(exports.RESPONSE_SCHEMA.properties.items.items.properties));
const CONTAINER_HINT = /\b(?:bowl|glass|cup|plate|serving|container)\b/iu;
const IMAGE_MIME_FALLBACKS = {
    '.avif': 'image/avif',
    '.gif': 'image/gif',
    '.heic': 'image/heic',
    '.heif': 'image/heif',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
};
exports.ALLOWED_IMAGE_MIME_TYPES = new Set([
    ...Object.values(IMAGE_MIME_FALLBACKS),
    'image/jpg',
]);
const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx']);
const HEIF_BRANDS = new Set([
    ...HEIC_BRANDS,
    'mif1',
    'mif2',
    'msf1',
]);
const AVIF_BRANDS = new Set(['avif', 'avis']);
function startsWithBytes(bytes, signature) {
    return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);
}
function ascii(bytes, offset, length) {
    if (offset < 0 || bytes.length < offset + length)
        return '';
    return String.fromCharCode(...bytes.subarray(offset, offset + length));
}
function hasFileTypeBrand(bytes, brands) {
    if (bytes.length < 16 || ascii(bytes, 4, 4) !== 'ftyp')
        return false;
    if (brands.has(ascii(bytes, 8, 4)))
        return true;
    for (let offset = 16; offset + 4 <= bytes.length; offset += 4) {
        if (brands.has(ascii(bytes, offset, 4)))
            return true;
    }
    return false;
}
/** Validate content signatures after the transport's declared MIME allow-list. */
function isSupportedImageBytes(mediaType, bytes) {
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
function configuredModelId(env = process.env) {
    return (env[exports.MODEL_ENV_VAR] ?? exports.DEFAULT_MODEL).trim() || exports.DEFAULT_MODEL;
}
class ProviderFailure extends Error {
    status;
    category;
    retryable;
    fallbackAllowed;
    retryAfter;
    attempts;
    constructor(message, init = {}) {
        super(message);
        this.name = 'ProviderFailure';
        this.status = init.status ?? null;
        this.category = init.category ?? 'provider_unavailable';
        this.retryable = init.retryable ?? false;
        this.fallbackAllowed = init.fallbackAllowed ?? true;
        this.retryAfter = init.retryAfter ?? null;
        this.attempts = init.attempts ?? 0;
    }
}
exports.ProviderFailure = ProviderFailure;
/** Safe terminal error crossing the provider/HTTP boundary. */
class VisionProviderError extends Error {
    category;
    attempts;
    detail;
    constructor(category, attempts, diagnostic) {
        const detail = category === 'provider_timeout' ? 'vision provider timeout' : 'vision provider unavailable';
        super(diagnostic ?? detail);
        this.name = 'VisionProviderError';
        this.category = category;
        this.attempts = Math.max(0, attempts);
        this.detail = detail;
    }
}
exports.VisionProviderError = VisionProviderError;
function safeTerminalDiagnostic(failure, rung) {
    const forbidden = /forbidden nutrient field\(s\): ([a-z0-9_, ]+)/u.exec(failure.message);
    if (forbidden) {
        return `Gemini response contains forbidden nutrient field(s): ${forbidden[1]}`;
    }
    if (failure.status !== null) {
        return `Gemini provider exhausted; terminal_status=${String(failure.status)}; rung=${rung}`;
    }
    return undefined;
}
/** `Retry-After` as seconds, accepting both the delta and HTTP-date forms. */
function retryAfterSeconds(headers, now = () => Date.now()) {
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
function isTimeoutError(error) {
    if (error instanceof Error) {
        if (error.name === 'TimeoutError' || error.name === 'AbortError') {
            return true;
        }
        return error.message.toLowerCase().includes('timed out');
    }
    return String(error).toLowerCase().includes('timed out');
}
/** Build the inline image part, refusing anything outside the allow-list. */
function imagePart(input) {
    if (input.imageBytes === null || !input.imageMediaType) {
        throw new Error('Gemini image input needs bytes and a MIME type');
    }
    const mimeType = input.imageMediaType.toLowerCase();
    if (!exports.ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
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
function describe(value) {
    if (typeof value === 'string') {
        return value;
    }
    try {
        return JSON.stringify(value) ?? String(value);
    }
    catch {
        return '[unserialisable]';
    }
}
function responseText(response) {
    const candidates = response.candidates;
    if (!Array.isArray(candidates) || candidates.length === 0) {
        const reason = response.promptFeedback ?? response.error ?? 'no candidates';
        throw new Error(`Gemini returned no candidate: ${describe(reason)}`);
    }
    const candidate = candidates[0];
    if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
        throw new TypeError('Gemini returned an invalid candidate');
    }
    const content = candidate.content;
    const parts = Array.isArray(content?.parts) ? content.parts : [];
    const text = parts
        .map((part) => typeof part === 'object' && part !== null && typeof part.text === 'string'
        ? part.text
        : '')
        .join('');
    if (!text) {
        const reason = candidate.finishReason ?? 'empty response';
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
function parseObservationItems(rawItems, label = 'Gemini', countOrigin = null) {
    if (!Array.isArray(rawItems)) {
        throw new TypeError(`${label} JSON response must contain an items array`);
    }
    return rawItems.map((raw, index) => {
        if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
            throw new TypeError(`${label} item ${index} is not an object`);
        }
        const record = raw;
        const present = Object.keys(record);
        const forbidden = present.filter((key) => exports.FORBIDDEN_NUTRIENT_FIELDS.has(key)).sort();
        if (forbidden.length > 0) {
            throw new Error(`${label} item ${index} contains forbidden nutrient field(s): ${forbidden.join(', ')}`);
        }
        const unknown = present.filter((key) => !exports.ALLOWED_ITEM_FIELDS.has(key)).sort();
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
        for (const optional of ['cooking_method', 'portion_hint']) {
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
        const countRaw = record.count;
        if (countRaw !== undefined
            && countRaw !== null
            && (typeof countRaw !== 'number' || !Number.isInteger(countRaw) || countRaw < 1)) {
            throw new Error(`${label} item ${index} count must be a positive integer or null`);
        }
        const mediumRaw = record.medium;
        const captureMediums = [
            'real_plate', 'screen', 'printed', 'toy_or_model', 'unclear',
        ];
        if (!captureMediums.includes(mediumRaw)) {
            throw new Error(`${label} item ${index} medium must be one of ${captureMediums.join(', ')}`);
        }
        const portionHint = record.portion_hint ?? null;
        const safeCount = countOrigin === 'vision' && (countRaw === 1
            || (portionHint !== null && CONTAINER_HINT.test(portionHint)))
            ? null
            : countRaw ?? null;
        return (0, models_1.makePerceivedItem)({
            surface_form: surfaceForm,
            cooking_method: record.cooking_method ?? null,
            portion_hint: portionHint,
            count: safeCount,
            count_origin: countOrigin,
            capture_medium: mediumRaw,
            confidence: confidenceRaw,
        });
    });
}
function parseItems(text, countOrigin = null) {
    let document;
    try {
        document = JSON.parse(text);
    }
    catch {
        throw new Error('Gemini returned non-JSON text despite JSON schema mode');
    }
    if (typeof document !== 'object' || document === null || Array.isArray(document)) {
        throw new TypeError('Gemini JSON response must contain an items array');
    }
    return parseObservationItems(document.items, 'Gemini', countOrigin);
}
const fetchTransport = async (request) => {
    const response = await fetch(request.url, {
        method: request.method,
        headers: { ...request.headers },
        body: request.body,
        signal: AbortSignal.timeout(request.timeoutMs),
    });
    const headers = {};
    response.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
    });
    return { status: response.status, headers, body: await response.text() };
};
class GeminiVision {
    name = 'gemini';
    apiKey;
    modelId;
    model;
    timeout;
    secondaryModel;
    maxAttempts;
    maxElapsed;
    requestInterval;
    requestCount = 0;
    lastItems = null;
    /** Strong only while perceive is in flight; recording uses the weak identity below. */
    lastInput = null;
    degraded = false;
    rung = exports.RUNG_CONFIGURED_MODEL;
    lastModel;
    lastAttempts = 0;
    transport;
    sleep;
    clock;
    jitter;
    onEvent;
    lastRequestStarted = null;
    lastInputRef = null;
    constructor(options) {
        if (!options.apiKey.trim()) {
            throw new Error('GEMINI_API_KEY is required for the live vision provider');
        }
        this.apiKey = options.apiKey;
        this.modelId = options.modelId ?? options.model ?? configuredModelId(options.env);
        this.model = this.modelId;
        this.timeout = options.timeout ?? 90.0;
        this.transport = options.transport ?? fetchTransport;
        this.secondaryModel = options.secondaryModel === undefined ? exports.SECONDARY_MODEL : options.secondaryModel;
        this.maxAttempts = Math.min(exports.MAX_ATTEMPTS, Math.max(1, options.maxAttempts ?? exports.MAX_ATTEMPTS));
        this.maxElapsed = Math.min(exports.MAX_ELAPSED_SECONDS, Math.max(0.1, options.maxElapsed ?? exports.MAX_ELAPSED_SECONDS));
        this.sleep = options.sleepFn ?? ((seconds) => new Promise((r) => setTimeout(r, seconds * 1000)));
        this.clock = options.clockFn ?? (() => Date.now() / 1000);
        this.jitter = options.jitterFn ?? ((cap) => Math.random() * cap);
        this.requestInterval = Math.max(0, options.requestInterval ?? exports.REQUEST_INTERVAL_SECONDS);
        this.onEvent = options.onEvent ?? (() => undefined);
        this.lastModel = this.modelId;
    }
    /**
     * Free-tier pacing. Python sleeps the remainder of the interval since the
     * previous request started; the recorder depends on it to stay inside quota.
     */
    async waitForRequestSlot() {
        const now = this.clock();
        if (this.lastRequestStarted !== null) {
            const remaining = this.requestInterval - (now - this.lastRequestStarted);
            if (remaining > 0) {
                await this.sleep(remaining);
            }
        }
        this.lastRequestStarted = this.clock();
    }
    async request(parts, model, timeout) {
        const payload = {
            systemInstruction: { parts: [{ text: exports.SYSTEM_PROMPT }] },
            contents: [{ role: 'user', parts }],
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: exports.RESPONSE_SCHEMA,
            },
        };
        const url = `${exports.API_ROOT}/models/${encodeURIComponent(model)}:generateContent`;
        await this.waitForRequestSlot();
        this.requestCount += 1;
        let response;
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
        }
        catch (error) {
            if (isTimeoutError(error)) {
                throw new ProviderFailure('Gemini request timed out', {
                    category: 'provider_timeout',
                    retryable: true,
                });
            }
            throw new ProviderFailure(`Gemini request failed: ${error instanceof Error ? error.message : String(error)}`, { category: 'provider_unavailable', retryable: false });
        }
        if (response.status < 200 || response.status >= 300) {
            const detail = response.body.slice(0, exports.MAX_ERROR_BODY);
            throw new ProviderFailure(`Gemini request failed with HTTP ${response.status}: ${detail}`, {
                status: response.status,
                category: 'provider_unavailable',
                retryable: exports.TRANSIENT_STATUS_CODES.has(response.status),
                fallbackAllowed: !exports.NON_RETRYABLE_STATUS_CODES.has(response.status),
                retryAfter: retryAfterSeconds(response.headers),
            });
        }
        try {
            return JSON.parse(response.body);
        }
        catch {
            throw new ProviderFailure('Gemini returned an invalid JSON envelope', {
                category: 'provider_unavailable',
                fallbackAllowed: true,
            });
        }
    }
    retryDelay(attempt, retryAfter) {
        const exponential = Math.min(exports.BACKOFF_CAP_SECONDS, exports.BACKOFF_BASE_SECONDS * 2 ** (attempt - 1));
        const jittered = Math.min(exports.BACKOFF_CAP_SECONDS, exponential + Math.max(0, this.jitter(exponential)));
        return Math.max(retryAfter ?? 0, jittered);
    }
    async requestWithRetry(parts, model, deadline) {
        let attempts = 0;
        let lastFailure = null;
        while (attempts < this.maxAttempts) {
            const remaining = deadline - this.clock();
            if (remaining <= 0) {
                break;
            }
            attempts += 1;
            try {
                const response = await this.request(parts, model, Math.min(this.timeout, remaining));
                return { response, attempts };
            }
            catch (error) {
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
    buildParts(input, includeImage) {
        const parts = [];
        const hasText = Boolean(input.text && input.text.trim());
        if (includeImage && input.imageBytes !== null) {
            parts.push(imagePart(input));
        }
        else if (!hasText) {
            throw new Error('live Gemini provider requires image bytes or explicit text; sample_id is fixture-only');
        }
        if (hasText) {
            parts.push({ text: input.text.trim() });
        }
        parts.push({ text: 'List only the visible food items using the required JSON schema.' });
        return parts;
    }
    /** Call Gemini with bounded retries and explicit fallback metadata. */
    async perceive(input) {
        const hasImage = input.imageBytes !== null;
        let degraded = false;
        this.lastInput = input;
        this.lastItems = null;
        this.lastInputRef = new WeakRef(input);
        try {
            this.degraded = false;
            this.rung = exports.RUNG_CONFIGURED_MODEL;
            this.lastModel = this.modelId;
            this.lastAttempts = 0;
            const started = this.clock();
            const deadline = started + this.maxElapsed;
            const rungChain = [[exports.RUNG_CONFIGURED_MODEL, this.model, true]];
            if (this.secondaryModel && this.secondaryModel !== this.model) {
                rungChain.push([exports.RUNG_SECONDARY_MODEL, this.secondaryModel, true]);
            }
            if (hasImage && input.text && input.text.trim()) {
                rungChain.push([exports.RUNG_TEXT_ONLY, this.secondaryModel ?? this.model, false]);
            }
            const failures = [];
            let totalAttempts = 0;
            for (const [rung, model, includeImage] of rungChain) {
                if (this.clock() >= deadline) {
                    break;
                }
                const parts = this.buildParts(input, includeImage);
                let attempts = 0;
                let items;
                try {
                    const outcome = await this.requestWithRetry(parts, model, deadline);
                    attempts = outcome.attempts;
                    items = parseItems(responseText(outcome.response), hasImage ? 'vision' : 'user_text');
                }
                catch (error) {
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
                        new ProviderFailure(error instanceof Error ? error.message : String(error), {
                            category: 'provider_unavailable',
                            attempts,
                        }),
                    ]);
                    continue;
                }
                totalAttempts += attempts;
                this.lastItems = items;
                this.lastModel = model;
                this.lastAttempts = totalAttempts;
                degraded = rung !== exports.RUNG_CONFIGURED_MODEL;
                this.degraded = degraded;
                this.rung = rung;
                if (degraded) {
                    this.onEvent('vision_fallback', { rung, model, attempts: totalAttempts });
                }
                return { observations: items, degraded };
            }
            const [lastRung, lastModel, lastFailure] = failures.length > 0
                ? failures[failures.length - 1]
                : [exports.RUNG_FAILURE, this.model, new ProviderFailure('Gemini retry wall-clock ceiling reached')];
            degraded = true;
            this.degraded = degraded;
            this.rung = exports.RUNG_FAILURE;
            this.lastModel = lastModel;
            this.lastAttempts = totalAttempts;
            const elapsedMs = Math.round((this.clock() - started) * 1000 * 100) / 100;
            this.onEvent('vision_provider_exhausted', {
                category: lastFailure.category,
                attempts: totalAttempts,
                retry_attempted: totalAttempts > 1,
                terminal_status: lastFailure.status,
                elapsed_ms: elapsedMs,
                rung: lastRung,
            });
            throw new VisionProviderError(lastFailure.category, totalAttempts, safeTerminalDiagnostic(lastFailure, lastRung));
        }
        finally {
            this.lastInput = null;
        }
    }
    /**
     * Return safe, deterministic fixture data from a validated response.
     *
     * Neither the image nor the response envelope is included: a fixture records
     * validated observations only, which is what makes it safe to commit.
     */
    fixturePayload(input, items) {
        if (!input.fixtureKey) {
            throw new Error('fixture recording needs an image hash or sample_id');
        }
        return {
            _synthetic: false,
            sample_id: input.sampleId,
            input_sha256: input.contentHash,
            provider: this.name,
            model_id: this.lastModel,
            prompt_version: exports.PROMPT_VERSION,
            input_kind: input.text && input.text.trim() ? 'user_text' : 'vision',
            degraded: this.degraded,
            rung: this.rung,
            attempts: this.lastAttempts,
            items: items.map((item) => {
                // Python writes `model_dump(exclude_none=True)`; a null optional is
                // omitted rather than serialised as null.
                const out = { surface_form: item.surface_form };
                if (item.cooking_method !== null)
                    out.cooking_method = item.cooking_method;
                if (item.portion_hint !== null)
                    out.portion_hint = item.portion_hint;
                if (item.count !== null)
                    out.count = item.count;
                out.medium = item.capture_medium;
                out.confidence = item.confidence;
                if (item.ungrounded_kcal !== null)
                    out.ungrounded_kcal = item.ungrounded_kcal;
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
    recordFixture(directory, input, path) {
        if (this.lastItems === null || this.lastInputRef?.deref() !== input) {
            throw new Error('record_fixture must follow a successful perceive call');
        }
        const key = input.fixtureKey;
        if (!key) {
            throw new Error('fixture recording needs an image hash or sample_id');
        }
        (0, node_fs_1.mkdirSync)(directory, { recursive: true });
        const target = path ?? (0, node_path_1.join)(directory, `${key}.json`);
        (0, node_fs_1.mkdirSync)((0, node_path_1.dirname)(target), { recursive: true });
        const temporary = `${target.replace(/\.json$/, '')}.json.tmp`;
        (0, node_fs_1.writeFileSync)(temporary, `${JSON.stringify(this.fixturePayload(input, this.lastItems), null, 2)}\n`, { encoding: 'utf-8' });
        (0, node_fs_1.renameSync)(temporary, target);
        return target;
    }
}
exports.GeminiVision = GeminiVision;
//# sourceMappingURL=vision.gemini.js.map