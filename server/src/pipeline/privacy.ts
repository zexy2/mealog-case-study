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

/** JPEG marker constants */
const JPEG_SOI = 0xffd8;
const JPEG_SOS = 0xffda;
const JPEG_EOI = 0xffd9;

/** Markers to strip (APP1=EXIF/GPS 0xFFE1, APP2=FlashPix 0xFFE2, APP13=IPTC 0xFFED, COM=Comment 0xFFFE) */
const STRIP_MARKERS = new Set([
  0xffe1, // APP1 (EXIF, GPS, XMP)
  0xffe2, // APP2 (ICC profile / metadata)
  0xffed, // APP13 (Photoshop / IPTC)
  0xfffe, // COM (Comment)
]);

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
export function stripExifJpeg(buffer: Uint8Array): Uint8Array {
  if (buffer.length < 4) return buffer;

  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  if (view.getUint16(0) !== JPEG_SOI) {
    return buffer; // Not a valid JPEG, return as-is
  }

  const chunks: Uint8Array[] = [];
  // Add SOI (2 bytes)
  chunks.push(buffer.subarray(0, 2));

  let offset = 2;
  let reachedScanData = false;

  while (offset < buffer.length - 1) {
    // Find next marker (starts with 0xFF)
    if (buffer[offset] !== 0xff) {
      offset++;
      continue;
    }

    const marker = view.getUint16(offset);

    // Standalone markers without payload length
    if (marker === JPEG_SOI || (marker >= 0xffd0 && marker <= 0xffd7) || marker === 0xff01) {
      chunks.push(buffer.subarray(offset, offset + 2));
      offset += 2;
      continue;
    }

    // End of image marker
    if (marker === JPEG_EOI) {
      chunks.push(buffer.subarray(offset, offset + 2));
      break;
    }

    // Start of Scan (SOS) - Image pixel entropy data begins here until EOI
    if (marker === JPEG_SOS) {
      reachedScanData = true;
      // SOS header length
      const length = view.getUint16(offset + 2);
      chunks.push(buffer.subarray(offset, offset + 2 + length));
      offset += 2 + length;
      // All remaining bytes up to end are image scan data
      chunks.push(buffer.subarray(offset));
      break;
    }

    // Markers with length field
    if (offset + 4 > buffer.length) break;
    const length = view.getUint16(offset + 2);

    if (STRIP_MARKERS.has(marker)) {
      // Skip this metadata marker entirely (EXIF / GPS / IPTC / COM)
      offset += 2 + length;
    } else {
      // Keep essential decoding marker (e.g. DQT 0xFFDB, SOF0 0xFFC0, DHT 0xFFC4, etc.)
      chunks.push(buffer.subarray(offset, Math.min(buffer.length, offset + 2 + length)));
      offset += 2 + length;
    }
  }

  if (!reachedScanData) {
    // If SOS wasn't properly encountered, fail-safe to original buffer
    return buffer;
  }

  // Concatenate cleaned chunks
  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(totalLength);
  let writeOffset = 0;
  for (const chunk of chunks) {
    result.set(chunk, writeOffset);
    writeOffset += chunk.length;
  }

  return result;
}

/**
 * Strips metadata chunks (eXIf, tEXt, zTXt, iTXt) from a PNG buffer.
 * Preserves critical PNG chunks: IHDR, PLTE, IDAT, IEND.
 *
 * @param buffer Raw PNG bytes
 * @returns Cleaned PNG bytes
 */
export function stripMetadataPng(buffer: Uint8Array): Uint8Array {
  if (buffer.length < 8) return buffer;

  // PNG Signature: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;

  if (!isPng) return buffer;

  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const chunks: Uint8Array[] = [buffer.subarray(0, 8)]; // PNG Signature
  const metadataChunkTypes = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME']);

  let offset = 8;
  while (offset + 12 <= buffer.length) {
    const length = view.getUint32(offset);
    const typeBytes = buffer.subarray(offset + 4, offset + 8);
    const type = String.fromCharCode(...typeBytes);
    const totalChunkLength = 12 + length; // 4 length + 4 type + length data + 4 CRC

    if (offset + totalChunkLength > buffer.length) break;

    if (!metadataChunkTypes.has(type)) {
      chunks.push(buffer.subarray(offset, offset + totalChunkLength));
    }

    offset += totalChunkLength;
    if (type === 'IEND') break;
  }

  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(totalLength);
  let writeOffset = 0;
  for (const chunk of chunks) {
    result.set(chunk, writeOffset);
    writeOffset += chunk.length;
  }

  return result;
}

/**
 * Checks whether an RGB pixel falls into human skin chrominance range (YCbCr space).
 * Standard bounds: Y > 40, 77 <= Cb <= 127, 133 <= Cr <= 173.
 */
export function isSkinPixel(r: number, g: number, b: number): boolean {
  // YCbCr transformation
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

  return y > 40 && cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173;
}

/**
 * Detects human face candidate bounding boxes in an RGBA pixel array using
 * skin-tone chrominance clustering and facial aspect ratio heuristics.
 */
export function detectFaceRegions(
  rgba: Uint8Array,
  width: number,
  height: number,
  minFaceSize = 24,
): BoundingBox[] {
  const skinGridWidth = Math.floor(width / 8);
  const skinGridHeight = Math.floor(height / 8);
  const skinDensity = new Uint8Array(skinGridWidth * skinGridHeight);

  // 1. Calculate skin pixel density in 8x8 blocks
  for (let gy = 0; gy < skinGridHeight; gy++) {
    for (let gx = 0; gx < skinGridWidth; gx++) {
      let skinPixels = 0;
      for (let py = 0; py < 8; py++) {
        for (let px = 0; px < 8; px++) {
          const idx = ((gy * 8 + py) * width + (gx * 8 + px)) * 4;
          if (idx + 3 < rgba.length) {
            const r = rgba[idx];
            const g = rgba[idx + 1];
            const b = rgba[idx + 2];
            if (isSkinPixel(r, g, b)) skinPixels++;
          }
        }
      }
      if (skinPixels >= 32) {
        // More than 50% skin in block
        skinDensity[gy * skinGridWidth + gx] = 1;
      }
    }
  }

  // 2. Find contiguous clusters forming face candidates
  const visited = new Uint8Array(skinDensity.length);
  const boxes: BoundingBox[] = [];

  for (let gy = 0; gy < skinGridHeight; gy++) {
    for (let gx = 0; gx < skinGridWidth; gx++) {
      const idx = gy * skinGridWidth + gx;
      if (skinDensity[idx] === 1 && visited[idx] === 0) {
        // Flood fill to find bounding box of cluster
        let minX = gx;
        let maxX = gx;
        let minY = gy;
        let maxY = gy;
        let count = 0;

        const queue: Array<[number, number]> = [[gx, gy]];
        visited[idx] = 1;

        while (queue.length > 0) {
          const item = queue.shift();
          if (!item) break;
          const [cx, cy] = item;
          count++;

          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;

          // 4-neighborhood
          const neighbors: Array<[number, number]> = [
            [cx + 1, cy],
            [cx - 1, cy],
            [cx, cy + 1],
            [cx, cy - 1],
          ];

          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < skinGridWidth && ny >= 0 && ny < skinGridHeight) {
              const nIdx = ny * skinGridWidth + nx;
              if (skinDensity[nIdx] === 1 && visited[nIdx] === 0) {
                visited[nIdx] = 1;
                queue.push([nx, ny]);
              }
            }
          }
        }

        const pixelW = (maxX - minX + 1) * 8;
        const pixelH = (maxY - minY + 1) * 8;

        // Human face aspect ratio is typically between 0.7 and 1.6
        const aspect = pixelH / Math.max(1, pixelW);
        if (pixelW >= minFaceSize && pixelH >= minFaceSize && aspect >= 0.6 && aspect <= 2.0 && count >= 4) {
          boxes.push({
            x: minX * 8,
            y: minY * 8,
            width: pixelW,
            height: pixelH,
            confidence: Math.min(1.0, count / 10),
          });
        }
      }
    }
  }

  return boxes;
}

/**
 * Applies multi-pass Gaussian box blur to a specific bounding box inside an RGBA buffer.
 * Destructively anonymizes the face region while keeping the rest of the image intact.
 */
export function blurBoundingBox(
  rgba: Uint8Array,
  width: number,
  height: number,
  box: BoundingBox,
  radius = 6,
): void {
  const startX = Math.max(0, box.x);
  const endX = Math.min(width, box.x + box.width);
  const startY = Math.max(0, box.y);
  const endY = Math.min(height, box.y + box.height);

  const w = endX - startX;
  const h = endY - startY;
  if (w <= 0 || h <= 0) return;

  // Multi-pass box blur (approximates smooth Gaussian blur, destroying facial features)
  for (let pass = 0; pass < 3; pass++) {
    const temp = new Uint8Array(w * h * 4);

    // Horizontal pass
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;
        for (let k = -radius; k <= radius; k++) {
          const nx = x + k;
          if (nx >= 0 && nx < w) {
            const idx = ((startY + y) * width + (startX + nx)) * 4;
            r += rgba[idx];
            g += rgba[idx + 1];
            b += rgba[idx + 2];
            count++;
          }
        }
        const tIdx = (y * w + x) * 4;
        temp[tIdx] = Math.round(r / count);
        temp[tIdx + 1] = Math.round(g / count);
        temp[tIdx + 2] = Math.round(b / count);
        temp[tIdx + 3] = 255;
      }
    }

    // Vertical pass back into rgba buffer
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;
        for (let k = -radius; k <= radius; k++) {
          const ny = y + k;
          if (ny >= 0 && ny < h) {
            const tIdx = (ny * w + x) * 4;
            r += temp[tIdx];
            g += temp[tIdx + 1];
            b += temp[tIdx + 2];
            count++;
          }
        }
        const idx = ((startY + y) * width + (startX + x)) * 4;
        rgba[idx] = Math.round(r / count);
        rgba[idx + 1] = Math.round(g / count);
        rgba[idx + 2] = Math.round(b / count);
      }
    }
  }
}

/**
 * Automatically detects and blurs all human face regions in an RGBA buffer.
 */
export function blurFacesInPixelArray(
  rgba: Uint8Array,
  width: number,
  height: number,
  explicitBoxes?: BoundingBox[],
  blockSize = 12,
): FaceAnonymizationResult {
  const boxes = explicitBoxes ?? detectFaceRegions(rgba, width, height);

  for (const box of boxes) {
    blurBoundingBox(rgba, width, height, box, blockSize);
  }

  return {
    blurredCount: boxes.length,
    boxes,
  };
}

/**
 * Computes the local Laplacian edge variance (sharpness score) of a region.
 * A sharp unblurred region has high variance (> 100); a blurred/mosaic region has very low variance (< 10).
 */
export function computeLocalVariance(
  rgba: Uint8Array,
  width: number,
  _height: number,
  box: BoundingBox,
): number {
  const startX = Math.max(1, box.x);
  const endX = Math.min(width - 1, box.x + box.width);
  const startY = Math.max(1, box.y);
  const endY = Math.min(_height - 1, box.y + box.height);

  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const idx = (y * width + x) * 4;
      const up = ((y - 1) * width + x) * 4;
      const down = ((y + 1) * width + x) * 4;
      const left = (y * width + (x - 1)) * 4;
      const right = (y * width + (x + 1)) * 4;

      // Convert RGB to luminance
      const lum = 0.299 * rgba[idx] + 0.587 * rgba[idx + 1] + 0.114 * rgba[idx + 2];
      const lumUp = 0.299 * rgba[up] + 0.587 * rgba[up + 1] + 0.114 * rgba[up + 2];
      const lumDown = 0.299 * rgba[down] + 0.587 * rgba[down + 1] + 0.114 * rgba[down + 2];
      const lumLeft = 0.299 * rgba[left] + 0.587 * rgba[left + 1] + 0.114 * rgba[left + 2];
      const lumRight = 0.299 * rgba[right] + 0.587 * rgba[right + 1] + 0.114 * rgba[right + 2];

      // 2D discrete Laplacian: 4*center - (up + down + left + right)
      const lap = 4 * lum - (lumUp + lumDown + lumLeft + lumRight);

      sum += lap;
      sumSq += lap * lap;
      count++;
    }
  }

  if (count === 0) return 0;
  const mean = sum / count;
  return sumSq / count - mean * mean;
}

/**
 * Universal image privacy sanitizer.
 * Strips all metadata, GPS tags, camera details, and non-visual user information.
 */
export function sanitizeImageBuffer(buffer: Uint8Array): Uint8Array {
  if (!buffer || buffer.length === 0) return buffer;

  // JPEG check (SOI marker 0xFFD8)
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    return stripExifJpeg(buffer);
  }

  // PNG check (Signature 0x89 'PNG')
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return stripMetadataPng(buffer);
  }

  return buffer;
}

/**
 * Detects and redacts personally identifiable information (PII) from user text or OCR output:
 * - Credit card numbers (13-19 digits formatted or raw) -> [REDACTED_CARD]
 * - International Bank Account Numbers (IBAN) -> [REDACTED_IBAN]
 * - Email addresses -> [REDACTED_EMAIL]
 * - Turkish National ID numbers (11 consecutive digits) -> [REDACTED_ID]
 * - Phone numbers -> [REDACTED_PHONE]
 */
export function sanitizePiiText(text: string): string {
  if (!text) return text;

  return text
    // Credit card patterns (e.g. 4532 1234 5678 9010 or 4532-1234-5678-9010)
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, '[REDACTED_CARD]')
    // IBAN patterns (e.g. TR330006100519786457841234 or generic IBANs)
    .replace(/\b[A-Z]{2}\d{2}[A-Z0-9]{4,30}\b/gi, '[REDACTED_IBAN]')
    // Email addresses
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[REDACTED_EMAIL]')
    // Turkish National ID / 11-digit identification numbers
    .replace(/\b\d{11}\b/g, '[REDACTED_ID]')
    // Phone numbers (e.g. +90 532 123 4567 or 0532 123 45 67)
    .replace(/(?:\+?\d{1,3}[ -]?)?\(?\d{3}\)?[ -]?\d{3}[ -]?\d{4}/g, '[REDACTED_PHONE]');
}

/**
 * Neutralizes prompt injection, jailbreak attempts, and adversarial control tokens
 * before strings reach perception or downstream inference.
 */
export function sanitizePromptInput(input: string): { cleanText: string; isInjectionDetected: boolean } {
  if (!input) return { cleanText: input, isInjectionDetected: false };

  const adversarialPatterns = [
    /ignore\s+(?:all\s+)?(?:previous\s+)?instructions/i,
    /system\s+prompt/i,
    /you\s+are\s+now\s+(?:an?\s+)?(?:unrestricted|admin|god)/i,
    /override\s+(?:all\s+)?(?:nutrition|calories|rules)/i,
    /return\s+(?:0|zero)\s+calories/i,
    /drop\s+table/i,
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /\[\s*system\s*\]/i,
    /\[\s*developer\s*\]/i,
    /assistant\s*:/i,
    /human\s*:/i,
  ];

  let detected = false;
  let sanitized = input;

  for (const pattern of adversarialPatterns) {
    if (pattern.test(sanitized)) {
      detected = true;
      sanitized = sanitized.replace(pattern, '[BLOCKED_INJECTION]');
    }
  }

  // Also strip null bytes and harmful non-printable control characters
  sanitized = Array.from(sanitized)
    .filter((char) => {
      const code = char.charCodeAt(0);
      return (code >= 32 && code !== 127) || code === 9 || code === 10 || code === 13;
    })
    .join('');

  return {
    cleanText: sanitizePiiText(sanitized),
    isInjectionDetected: detected,
  };
}
