"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const privacy_1 = require("../src/pipeline/privacy");
(0, vitest_1.describe)('Privacy & Image Metadata Sanitizer', () => {
    (0, vitest_1.it)('strips JPEG APP1 (EXIF / GPS) markers while preserving visual image structure', () => {
        // Construct a synthetic JPEG with:
        // SOI (0xFFD8)
        // APP1 (0xFFE1) with length 0x000A (10 bytes total: 2 len + 8 payload containing fake GPS)
        // DQT (0xFFDB) with length 0x0006 (6 bytes total: 2 len + 4 payload)
        // SOS (0xFFDA) with length 0x0004 (4 bytes total: 2 len + 2 payload)
        // Scan pixel data [0x12, 0x34]
        // EOI (0xFFD9)
        const rawJpeg = new Uint8Array([
            0xff, 0xd8, // SOI
            0xff, 0xe1, 0x00, 0x0a, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0x47, 0x50, // APP1 EXIF (GPS tags)
            0xff, 0xdb, 0x00, 0x06, 0x01, 0x02, 0x03, 0x04, // DQT (Quantization table)
            0xff, 0xda, 0x00, 0x04, 0xaa, 0xbb, // SOS (Start of Scan)
            0x12, 0x34, // Image entropy payload
            0xff, 0xd9, // EOI
        ]);
        const sanitized = (0, privacy_1.stripExifJpeg)(rawJpeg);
        // Verify sanitized buffer starts with SOI and ends with EOI
        (0, vitest_1.expect)(sanitized[0]).toBe(0xff);
        (0, vitest_1.expect)(sanitized[1]).toBe(0xd8);
        (0, vitest_1.expect)(sanitized[sanitized.length - 2]).toBe(0xff);
        (0, vitest_1.expect)(sanitized[sanitized.length - 1]).toBe(0xd9);
        // Verify APP1 marker (0xFF, 0xE1) is completely gone
        const hasApp1 = sanitized.some((byte, index) => byte === 0xff && sanitized[index + 1] === 0xe1);
        (0, vitest_1.expect)(hasApp1).toBe(false);
        // Verify essential DQT and SOS markers remain present
        const hasDqt = sanitized.some((byte, index) => byte === 0xff && sanitized[index + 1] === 0xdb);
        (0, vitest_1.expect)(hasDqt).toBe(true);
        const hasSos = sanitized.some((byte, index) => byte === 0xff && sanitized[index + 1] === 0xda);
        (0, vitest_1.expect)(hasSos).toBe(true);
    });
    (0, vitest_1.it)('strips PNG metadata chunks (eXIf, tEXt) while preserving IHDR, IDAT, IEND', () => {
        // Construct synthetic PNG
        // Signature: 8 bytes
        // IHDR chunk: 4 len (0x0000000D) + 4 type ('IHDR') + 13 data + 4 CRC = 25 bytes
        // tEXt chunk: 4 len (0x00000008) + 4 type ('tEXt') + 8 data + 4 CRC = 20 bytes
        // IDAT chunk: 4 len (0x00000004) + 4 type ('IDAT') + 4 data + 4 CRC = 16 bytes
        // IEND chunk: 4 len (0x00000000) + 4 type ('IEND') + 0 data + 4 CRC = 12 bytes
        const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
        const ihdrPayload = new Array(13).fill(1);
        const ihdrChunk = [0, 0, 0, 13, 73, 72, 68, 82, ...ihdrPayload, 0, 0, 0, 0];
        const textPayload = new Array(8).fill(2);
        const textChunk = [0, 0, 0, 8, 116, 69, 88, 116, ...textPayload, 0, 0, 0, 0];
        const idatChunk = [0, 0, 0, 4, 73, 68, 65, 84, 10, 20, 30, 40, 0, 0, 0, 0];
        const iendChunk = [0, 0, 0, 0, 73, 69, 78, 68, 0, 0, 0, 0];
        const rawPng = new Uint8Array([
            ...pngSignature,
            ...ihdrChunk,
            ...textChunk,
            ...idatChunk,
            ...iendChunk,
        ]);
        const sanitized = (0, privacy_1.stripMetadataPng)(rawPng);
        // Verify signature
        (0, vitest_1.expect)(Array.from(sanitized.subarray(0, 8))).toEqual(pngSignature);
        // Verify 'tEXt' metadata is stripped
        const rawString = String.fromCharCode(...sanitized);
        (0, vitest_1.expect)(rawString).not.toContain('tEXt');
        (0, vitest_1.expect)(rawString).toContain('IHDR');
        (0, vitest_1.expect)(rawString).toContain('IDAT');
        (0, vitest_1.expect)(rawString).toContain('IEND');
    });
    (0, vitest_1.it)('sanitizeImageBuffer handles valid images and non-image buffers gracefully', () => {
        const dummyBytes = new Uint8Array([1, 2, 3, 4, 5]);
        const clean = (0, privacy_1.sanitizeImageBuffer)(dummyBytes);
        (0, vitest_1.expect)(clean).toEqual(dummyBytes);
    });
});
//# sourceMappingURL=pipeline.privacy.test.js.map