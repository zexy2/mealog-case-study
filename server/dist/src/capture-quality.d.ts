/**
 * Offline capture-quality measurement.
 *
 * This module deliberately stops at measurement.  It is not imported by the
 * meal pipeline, runner, gate, or HTTP response.  PNG decoding uses Node's
 * built-in zlib only so calibration can inspect the committed image set
 * without adding an image-processing dependency.
 */
export interface GrayImage {
    readonly width: number;
    readonly height: number;
    /** One 8-bit luma value per pixel, row-major. */
    readonly pixels: Uint8Array;
}
export type CaptureQualityBand = 'textureless' | 'below_0_10' | '0_10_to_0_15' | '0_15_to_0_30' | 'at_or_above_0_30';
export interface CaptureQualityMeasurement {
    readonly width: number;
    readonly height: number;
    readonly laplacianVariance: number;
    readonly textureVariance: number;
    /** Null means the image is textureless and the ratio is undefined. */
    readonly normalizedLaplacianVariance: number | null;
    readonly textureless: boolean;
    /** Diagnostic bands from this calibration; not a production gate. */
    readonly thresholdBand: CaptureQualityBand;
}
/** Decode the non-interlaced 8-bit PNG forms used by the calibration set. */
export declare function decodePng(bytes: Uint8Array): GrayImage;
export declare function measureCaptureQuality(image: GrayImage): CaptureQualityMeasurement;
export declare function measurePngCaptureQuality(bytes: Uint8Array): CaptureQualityMeasurement;
