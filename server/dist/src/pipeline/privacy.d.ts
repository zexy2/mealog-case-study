/**
 * @file privacy.ts
 * Pure, framework-independent privacy, metadata sanitization, and face blurring utilities.
 *
 * Privacy by Design guarantees:
 * 1. EXIF & Geolocation Stripping: Removes GPS coordinates, device serial numbers,
 *    and user metadata from JPEG/PNG images before sending to LLM providers.
 * 2. Biometric Anonymization: Automatically detects human face regions and applies
 *    mosaic/pixelation blur to protect user identities while preserving food features.
 */
export interface BoundingBox {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly confidence?: number;
}
export interface FaceAnonymizationResult {
    readonly blurredCount: number;
    readonly boxes: BoundingBox[];
}
/**
 * Strips EXIF metadata, GPS tags, camera details, and comments from a JPEG buffer.
 * Preserves essential image data: SOI, DQT (quantization), SOF (frame), DHT (huffman), SOS (scan), EOI.
 *
 * @param buffer Raw JPEG bytes
 * @returns Cleaned JPEG bytes with zero geolocation or device metadata
 */
export declare function stripExifJpeg(buffer: Uint8Array): Uint8Array;
/**
 * Strips metadata chunks (eXIf, tEXt, zTXt, iTXt) from a PNG buffer.
 * Preserves critical PNG chunks: IHDR, PLTE, IDAT, IEND.
 *
 * @param buffer Raw PNG bytes
 * @returns Cleaned PNG bytes
 */
export declare function stripMetadataPng(buffer: Uint8Array): Uint8Array;
/**
 * Checks whether an RGB pixel falls into human skin chrominance range (YCbCr space).
 * Standard bounds: Y > 40, 77 <= Cb <= 127, 133 <= Cr <= 173.
 */
export declare function isSkinPixel(r: number, g: number, b: number): boolean;
/**
 * Detects human face candidate bounding boxes in an RGBA pixel array using
 * skin-tone chrominance clustering and facial aspect ratio heuristics.
 */
export declare function detectFaceRegions(rgba: Uint8Array, width: number, height: number, minFaceSize?: number): BoundingBox[];
/**
 * Applies multi-pass Gaussian box blur to a specific bounding box inside an RGBA buffer.
 * Destructively anonymizes the face region while keeping the rest of the image intact.
 */
export declare function blurBoundingBox(rgba: Uint8Array, width: number, height: number, box: BoundingBox, radius?: number): void;
/**
 * Automatically detects and blurs all human face regions in an RGBA buffer.
 */
export declare function blurFacesInPixelArray(rgba: Uint8Array, width: number, height: number, explicitBoxes?: BoundingBox[], blockSize?: number): FaceAnonymizationResult;
/**
 * Computes the local Laplacian edge variance (sharpness score) of a region.
 * A sharp unblurred region has high variance (> 100); a blurred/mosaic region has very low variance (< 10).
 */
export declare function computeLocalVariance(rgba: Uint8Array, width: number, _height: number, box: BoundingBox): number;
/**
 * Universal image privacy sanitizer.
 * Strips all metadata, GPS tags, camera details, and non-visual user information.
 */
export declare function sanitizeImageBuffer(buffer: Uint8Array): Uint8Array;
/**
 * Detects and redacts personally identifiable information (PII) from user text or OCR output:
 * - Credit card numbers (13-19 digits formatted or raw) -> [REDACTED_CARD]
 * - International Bank Account Numbers (IBAN) -> [REDACTED_IBAN]
 * - Email addresses -> [REDACTED_EMAIL]
 * - Turkish National ID numbers (11 consecutive digits) -> [REDACTED_ID]
 * - Phone numbers -> [REDACTED_PHONE]
 */
export declare function sanitizePiiText(text: string): string;
/**
 * Neutralizes prompt injection, jailbreak attempts, and adversarial control tokens
 * before strings reach perception or downstream inference.
 */
export declare function sanitizePromptInput(input: string): {
    cleanText: string;
    isInjectionDetected: boolean;
};
