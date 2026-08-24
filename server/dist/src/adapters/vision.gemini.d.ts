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
import { VisionInput, type VisionResult } from '../pipeline/ports';
import type { CountOrigin, PerceivedItem } from '../domain/models';
export declare const PROMPT_VERSION = "p4";
export declare const DEFAULT_MODEL = "gemini-flash-lite-latest";
export declare const SECONDARY_MODEL = "gemini-2.5-flash-lite";
export declare const MODEL_ENV_VAR = "GEMINI_MODEL";
export declare const REQUEST_INTERVAL_SECONDS = 4;
export declare const API_ROOT = "https://generativelanguage.googleapis.com/v1beta";
export declare const MAX_ERROR_BODY = 500;
export declare const TRANSIENT_STATUS_CODES: ReadonlySet<number>;
export declare const NON_RETRYABLE_STATUS_CODES: ReadonlySet<number>;
export declare const MAX_ATTEMPTS = 3;
export declare const MAX_ELAPSED_SECONDS = 30;
export declare const BACKOFF_BASE_SECONDS = 0.25;
export declare const BACKOFF_CAP_SECONDS = 2;
export declare const RUNG_CONFIGURED_MODEL = "configured_model";
export declare const RUNG_SECONDARY_MODEL = "secondary_model";
export declare const RUNG_TEXT_ONLY = "text_only";
export declare const RUNG_FAILURE = "failure";
export type ProviderErrorCategory = 'provider_timeout' | 'provider_unavailable';
export declare const SYSTEM_PROMPT = "You list what food is visible in the supplied image or text.\nReturn observed items only. You do NOT estimate calories, macros, nutrients, or\ngrams. The downstream catalogue and nutrition stages handle those values.\n\nRules:\n- Name dishes in the language on the plate's origin if you recognise it.\n- If unsure between two dishes, return the more general one and lower confidence.\n- Never invent an item you cannot see. Omission is cheaper than invention.\n- Strict Admissibility Gates:\n  * If the image is blurry, out of focus, motion-blurred, or unrecognizable, do NOT guess dishes (e.g. do not guess pie, soup, or bread). Return empty items: [].\n  * If the image shows plastic toy food, fake miniature models, decorative replicas, or inedible synthetic items, do NOT treat them as food. Return empty items: [].\n  * If the image depicts a smartphone/digital screen, laptop monitor, or printed photograph displaying a picture of food rather than real food in person, do NOT extract the meal on the screen. Return empty items: [].\n  * If the plate or table is empty (no food present), return empty items: [].\n- Set `count` only when items are individually countable and every instance is\n  distinctly visible. Overlapping, stacked, cropped, or occluded instances must\n  return `count: null`; never guess. Two stacked simit rings are an occluded\n  arrangement: return `count: null` even if two rings appear recognisable.\n- On a plate or meal with multiple distinct edible components (such as meat/fish alongside side vegetables, potatoes, rice, salad, bread, or drink), report each distinct edible food component as an item in the items list.\n- Never count liquid volume, pixels, or a serving container as multiple food instances. Do not report non-food objects (cutlery, wallet, receipt, table), inedible garnish, decorative leaves, or unidentifiable background as separate food items. Do not add ABSTAIN or other placeholder items.\n\n\n- `count` is the only count field. Keep `portion_hint` non-numeric: use a\n  qualitative description such as `whole`, `bowl`, or `stacked`, never a\n  count, gram estimate, or numeric serving estimate.\n- Set `medium` to exactly one of `real_plate`, `screen`, `printed`,\n  `toy_or_model`, or `unclear` for every observed item. Use `screen` for food\n  shown inside a display, `printed` for paper, packaging, or other printed\n  imagery, and `toy_or_model` for a toy, miniature, moulded replica, or\n  obviously synthetic food. Use `real_plate` only for a real serving\n  photographed directly. If you cannot tell, or the image is torn between a\n  real serving and another medium, use `unclear`. `real_plate` is neutral\n  evidence, never positive evidence.\n";
export declare const RESPONSE_SCHEMA: {
    readonly type: "OBJECT";
    readonly properties: {
        readonly items: {
            readonly type: "ARRAY";
            readonly items: {
                readonly type: "OBJECT";
                readonly properties: {
                    readonly surface_form: {
                        readonly type: "STRING";
                        readonly description: "The visible dish or food name.";
                    };
                    readonly cooking_method: {
                        readonly type: "STRING";
                        readonly description: "Visible or explicitly stated cooking method.";
                    };
                    readonly portion_hint: {
                        readonly type: "STRING";
                        readonly description: "Non-numeric serving description, if visible or stated.";
                    };
                    readonly count: {
                        readonly type: "INTEGER";
                        readonly nullable: true;
                        readonly minimum: 1;
                        readonly description: "Count only when each individually countable instance is distinctly visible; otherwise null.";
                    };
                    readonly medium: {
                        readonly type: "STRING";
                        readonly enum: readonly ["real_plate", "screen", "printed", "toy_or_model", "unclear"];
                        readonly description: "Capture medium; real_plate is neutral, every other value is a safety red flag.";
                    };
                    readonly confidence: {
                        readonly type: "NUMBER";
                        readonly minimum: 0;
                        readonly maximum: 1;
                        readonly description: "Confidence that this item is present, from 0 to 1.";
                    };
                };
                readonly required: readonly ["surface_form", "cooking_method", "portion_hint", "count", "medium", "confidence"];
            };
        };
    };
    readonly required: readonly ["items"];
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
export declare const FORBIDDEN_NUTRIENT_FIELDS: ReadonlySet<string>;
export declare const ALLOWED_ITEM_FIELDS: ReadonlySet<string>;
export declare const ALLOWED_IMAGE_MIME_TYPES: ReadonlySet<string>;
/** Validate content signatures after the transport's declared MIME allow-list. */
export declare function isSupportedImageBytes(mediaType: string, bytes: Uint8Array): boolean;
/** Read the live model from environment-backed application config. */
export declare function configuredModelId(env?: NodeJS.ProcessEnv): string;
export interface ProviderFailureInit {
    status?: number | null;
    category?: ProviderErrorCategory;
    retryable?: boolean;
    fallbackAllowed?: boolean;
    retryAfter?: number | null;
    attempts?: number;
}
export declare class ProviderFailure extends Error {
    readonly status: number | null;
    readonly category: ProviderErrorCategory;
    readonly retryable: boolean;
    readonly fallbackAllowed: boolean;
    readonly retryAfter: number | null;
    attempts: number;
    constructor(message: string, init?: ProviderFailureInit);
}
/** Safe terminal error crossing the provider/HTTP boundary. */
export declare class VisionProviderError extends Error {
    readonly category: ProviderErrorCategory;
    readonly attempts: number;
    readonly detail: string;
    constructor(category: ProviderErrorCategory, attempts: number, diagnostic?: string);
}
/** `Retry-After` as seconds, accepting both the delta and HTTP-date forms. */
export declare function retryAfterSeconds(headers: Readonly<Record<string, string | undefined>> | undefined, now?: () => number): number | null;
export declare function isTimeoutError(error: unknown): boolean;
/** Build the inline image part, refusing anything outside the allow-list. */
export declare function imagePart(input: VisionInput): Record<string, unknown>;
export declare function responseText(response: Record<string, unknown>): string;
/**
 * Validate one provider response's items into observations.
 *
 * The forbidden-field check runs *before* the unknown-field check so that a
 * response carrying `kcal` reports the D1 violation rather than the generic
 * "unknown field", which is the difference between a diagnosable failure and a
 * shrug. Both reject the whole response.
 */
export declare function parseObservationItems(rawItems: unknown, label?: string, countOrigin?: CountOrigin): PerceivedItem[];
export declare function parseItems(text: string, countOrigin?: CountOrigin): PerceivedItem[];
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
    readonly input_kind: 'vision' | 'user_text';
    readonly degraded: boolean;
    readonly rung: string;
    readonly attempts: number;
    readonly items: Record<string, unknown>[];
}
export declare class GeminiVision {
    readonly name = "gemini";
    readonly apiKey: string;
    readonly modelId: string;
    readonly model: string;
    readonly timeout: number;
    readonly secondaryModel: string | null;
    readonly maxAttempts: number;
    readonly maxElapsed: number;
    readonly requestInterval: number;
    requestCount: number;
    lastItems: PerceivedItem[] | null;
    /** Strong only while perceive is in flight; recording uses the weak identity below. */
    lastInput: VisionInput | null;
    degraded: boolean;
    rung: string;
    lastModel: string;
    lastAttempts: number;
    private readonly transport;
    private readonly sleep;
    private readonly clock;
    private readonly jitter;
    private readonly onEvent;
    private lastRequestStarted;
    private lastInputRef;
    constructor(options: GeminiVisionOptions);
    /**
     * Free-tier pacing. Python sleeps the remainder of the interval since the
     * previous request started; the recorder depends on it to stay inside quota.
     */
    private waitForRequestSlot;
    private request;
    private retryDelay;
    private requestWithRetry;
    private buildParts;
    /** Call Gemini with bounded retries and explicit fallback metadata. */
    perceive(input: VisionInput): Promise<VisionResult>;
    /**
     * Return safe, deterministic fixture data from a validated response.
     *
     * Neither the image nor the response envelope is included: a fixture records
     * validated observations only, which is what makes it safe to commit.
     */
    fixturePayload(input: VisionInput, items: PerceivedItem[]): FixturePayload;
    /**
     * Persist last validated observations without the image or envelope.
     *
     * Written to a temporary file and renamed, so a fixture is never observed
     * half-written — the recorder can be interrupted without corrupting the
     * parity reference. Writing the same validated response twice produces a
     * byte-identical file, which is what makes re-running the recorder safe.
     */
    recordFixture(directory: string, input: VisionInput, path?: string): string;
}
