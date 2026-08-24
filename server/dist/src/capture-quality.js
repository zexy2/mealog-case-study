"use strict";
/**
 * Offline capture-quality measurement.
 *
 * This module deliberately stops at measurement.  It is not imported by the
 * meal pipeline, runner, gate, or HTTP response.  PNG decoding uses Node's
 * built-in zlib only so calibration can inspect the committed image set
 * without adding an image-processing dependency.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodePng = decodePng;
exports.measureCaptureQuality = measureCaptureQuality;
exports.measurePngCaptureQuality = measurePngCaptureQuality;
const node_zlib_1 = require("node:zlib");
const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const TEXTURE_EPSILON = 1e-12;
function readUint32(bytes, offset) {
    return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset);
}
function sameBytes(left, right) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
}
function luma(red, green, blue) {
    return Math.round((299 * red + 587 * green + 114 * blue) / 1000);
}
function paeth(left, above, upperLeft) {
    const estimate = left + above - upperLeft;
    const leftDistance = Math.abs(estimate - left);
    const aboveDistance = Math.abs(estimate - above);
    const upperLeftDistance = Math.abs(estimate - upperLeft);
    if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance)
        return left;
    if (aboveDistance <= upperLeftDistance)
        return above;
    return upperLeft;
}
function unfilterRow(filtered, previous, filterType, bytesPerPixel) {
    const row = new Uint8Array(filtered.length);
    for (let index = 0; index < filtered.length; index += 1) {
        const left = index >= bytesPerPixel ? row[index - bytesPerPixel] : 0;
        const above = previous?.[index] ?? 0;
        const upperLeft = index >= bytesPerPixel ? (previous?.[index - bytesPerPixel] ?? 0) : 0;
        const value = filtered[index];
        switch (filterType) {
            case 0:
                row[index] = value;
                break;
            case 1:
                row[index] = (value + left) & 0xff;
                break;
            case 2:
                row[index] = (value + above) & 0xff;
                break;
            case 3:
                row[index] = (value + Math.floor((left + above) / 2)) & 0xff;
                break;
            case 4:
                row[index] = (value + paeth(left, above, upperLeft)) & 0xff;
                break;
            default:
                throw new Error(`unsupported PNG row filter ${filterType}`);
        }
    }
    return row;
}
/** Decode the non-interlaced 8-bit PNG forms used by the calibration set. */
function decodePng(bytes) {
    if (bytes.length < PNG_SIGNATURE.length || !sameBytes(bytes.subarray(0, 8), PNG_SIGNATURE)) {
        throw new Error('not a PNG image');
    }
    let offset = PNG_SIGNATURE.length;
    let width = 0;
    let height = 0;
    let bitDepth = 0;
    let colorType = 0;
    let interlaceMethod = 0;
    const idat = [];
    let sawHeader = false;
    while (offset + 12 <= bytes.length) {
        const length = readUint32(bytes, offset);
        offset += 4;
        const type = String.fromCharCode(...bytes.subarray(offset, offset + 4));
        offset += 4;
        if (length > bytes.length - offset - 4)
            throw new Error('truncated PNG chunk');
        const data = bytes.subarray(offset, offset + length);
        offset += length;
        offset += 4; // CRC is not used for the measurement; the PNG decoder validates structure.
        if (type === 'IHDR') {
            if (sawHeader || data.length !== 13)
                throw new Error('invalid PNG header');
            width = readUint32(data, 0);
            height = readUint32(data, 4);
            bitDepth = data[8];
            colorType = data[9];
            if (data[10] !== 0 || data[11] !== 0)
                throw new Error('unsupported PNG compression or filter');
            interlaceMethod = data[12];
            sawHeader = true;
        }
        else if (type === 'IDAT') {
            idat.push(data);
        }
        else if (type === 'IEND') {
            break;
        }
    }
    if (!sawHeader || width === 0 || height === 0 || idat.length === 0) {
        throw new Error('PNG is missing image data');
    }
    if (bitDepth !== 8 || ![0, 2, 4, 6].includes(colorType)) {
        throw new Error('PNG must use 8-bit grayscale, RGB, grayscale-alpha, or RGBA pixels');
    }
    if (interlaceMethod !== 0)
        throw new Error('interlaced PNG is not supported');
    const channels = colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 4 ? 2 : 4;
    const rowBytes = width * channels;
    const inflated = new Uint8Array((0, node_zlib_1.inflateSync)(Buffer.concat(idat.map((part) => Buffer.from(part)))));
    const expectedLength = height * (rowBytes + 1);
    if (inflated.length !== expectedLength)
        throw new Error('PNG scanline length does not match its dimensions');
    const pixels = new Uint8Array(width * height);
    let previous;
    let sourceOffset = 0;
    for (let y = 0; y < height; y += 1) {
        const filterType = inflated[sourceOffset];
        sourceOffset += 1;
        const filtered = inflated.subarray(sourceOffset, sourceOffset + rowBytes);
        sourceOffset += rowBytes;
        const row = unfilterRow(filtered, previous, filterType, channels);
        previous = row;
        for (let x = 0; x < width; x += 1) {
            const source = x * channels;
            pixels[y * width + x] = colorType === 0 || colorType === 4
                ? row[source]
                : luma(row[source], row[source + 1], row[source + 2]);
        }
    }
    return { width, height, pixels };
}
function variance(values) {
    let count = 0;
    let mean = 0;
    let sumOfSquares = 0;
    for (const value of values) {
        count += 1;
        const delta = value - mean;
        mean += delta / count;
        sumOfSquares += delta * (value - mean);
    }
    return { count, value: count > 0 ? sumOfSquares / count : 0 };
}
function laplacianValues(image) {
    return (function* values() {
        for (let y = 1; y < image.height - 1; y += 1) {
            for (let x = 1; x < image.width - 1; x += 1) {
                const center = image.pixels[y * image.width + x];
                yield 4 * center
                    - image.pixels[(y - 1) * image.width + x]
                    - image.pixels[(y + 1) * image.width + x]
                    - image.pixels[y * image.width + x - 1]
                    - image.pixels[y * image.width + x + 1];
            }
        }
    })();
}
function thresholdBand(score) {
    if (score === null)
        return 'textureless';
    if (score < 0.1)
        return 'below_0_10';
    if (score < 0.15)
        return '0_10_to_0_15';
    if (score < 0.3)
        return '0_15_to_0_30';
    return 'at_or_above_0_30';
}
function measureCaptureQuality(image) {
    if (image.width < 1 || image.height < 1 || image.pixels.length !== image.width * image.height) {
        throw new Error('grayscale image dimensions do not match its pixels');
    }
    const texture = variance(image.pixels);
    const laplacian = variance(laplacianValues(image));
    const textureless = texture.value <= TEXTURE_EPSILON;
    const normalizedLaplacianVariance = textureless ? null : laplacian.value / texture.value;
    return {
        width: image.width,
        height: image.height,
        laplacianVariance: laplacian.value,
        textureVariance: texture.value,
        normalizedLaplacianVariance,
        textureless,
        thresholdBand: thresholdBand(normalizedLaplacianVariance),
    };
}
function measurePngCaptureQuality(bytes) {
    return measureCaptureQuality(decodePng(bytes));
}
//# sourceMappingURL=capture-quality.js.map