import { deflateSync } from 'node:zlib';

import { describe, expect, it } from 'vitest';

import { measureCaptureQuality, measurePngCaptureQuality, type GrayImage } from '../src/capture-quality';

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const typeBytes = Buffer.from(type, 'ascii');
  const payload = Buffer.concat([typeBytes, Buffer.from(data)]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(payload));
  return Buffer.concat([length, payload, checksum]);
}

function rgbaPng(width: number, height: number, pixels: Uint8Array, compressionLevel: number): Uint8Array {
  const rows = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    rows[rowStart] = 0;
    Buffer.from(pixels).copy(rows, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: compressionLevel })),
    chunk('IEND', new Uint8Array()),
  ]);
  return new Uint8Array(png);
}

const CHECKERBOARD: Uint8Array = new Uint8Array([
  255, 255, 255, 255, 0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 255,
  0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 255,
  0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 255, 255, 255, 255, 255,
]);

describe('capture quality measurement', () => {
  it('normalizes the Laplacian variance by image texture variance', () => {
    const image: GrayImage = {
      width: 4,
      height: 4,
      pixels: new Uint8Array([
        255, 0, 255, 0,
        0, 255, 0, 255,
        255, 0, 255, 0,
        0, 255, 0, 255,
      ]),
    };

    const result = measureCaptureQuality(image);

    expect(result.textureless).toBe(false);
    expect(result.normalizedLaplacianVariance).toBeCloseTo(
      result.laplacianVariance / result.textureVariance,
      12,
    );
    expect(result.thresholdBand).toBe('at_or_above_0_30');
  });

  it('treats a uniform white frame as textureless, not blurry', () => {
    const result = measureCaptureQuality({
      width: 4,
      height: 4,
      pixels: new Uint8Array(16).fill(255),
    });

    expect(result.textureVariance).toBe(0);
    expect(result.laplacianVariance).toBe(0);
    expect(result.normalizedLaplacianVariance).toBeNull();
    expect(result.textureless).toBe(true);
    expect(result.thresholdBand).toBe('textureless');
  });

  it('produces the same measurement after the same image is re-encoded', () => {
    const first = measurePngCaptureQuality(rgbaPng(4, 4, CHECKERBOARD, 1));
    const second = measurePngCaptureQuality(rgbaPng(4, 4, CHECKERBOARD, 9));

    expect(second).toEqual(first);
  });

  it('reports decoded dimensions and rejects malformed image bytes', () => {
    const result = measurePngCaptureQuality(rgbaPng(4, 4, CHECKERBOARD, 6));
    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
    expect(() => measurePngCaptureQuality(new Uint8Array([1, 2, 3]))).toThrow(/not a PNG/);
  });
});
