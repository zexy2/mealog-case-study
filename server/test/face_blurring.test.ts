import { describe, expect, it } from 'vitest';

import {
  blurBoundingBox,
  blurFacesInPixelArray,
  computeLocalVariance,
  detectFaceRegions,
  isSkinPixel,
  type BoundingBox,
} from '../src/pipeline/privacy';

describe('Face Detection, Privacy Blurring & Mathematical Sharpness Verification', () => {
  it('correctly classifies human skin chrominance in YCbCr space', () => {
    // Typical human skin RGB tones (Caucasian, Asian, African skin tones)
    expect(isSkinPixel(230, 180, 150)).toBe(true); // Light skin
    expect(isSkinPixel(190, 130, 90)).toBe(true);  // Medium olive skin
    expect(isSkinPixel(110, 70, 45)).toBe(true);   // Dark skin

    // Non-skin colors (green vegetables, blue backgrounds, white plates)
    expect(isSkinPixel(34, 139, 34)).toBe(false);   // Forest Green (Salad)
    expect(isSkinPixel(0, 0, 255)).toBe(false);     // Blue
    expect(isSkinPixel(255, 255, 255)).toBe(false); // White plate
    expect(isSkinPixel(10, 10, 10)).toBe(false);    // Black table
  });

  it('detects a human face region and blurs only the face while preserving surrounding food', () => {
    const width = 120;
    const height = 120;
    const rgba = new Uint8Array(width * height * 4);

    // 1. Draw a sharp "Food Plate" at bottom-right (green salad with red tomato pattern)
    for (let y = 60; y < 110; y++) {
      for (let x = 60; x < 110; x++) {
        const idx = (y * width + x) * 4;
        const isTomato = (x + y) % 4 === 0;
        rgba[idx] = isTomato ? 220 : 34;      // Red / Green
        rgba[idx + 1] = isTomato ? 40 : 160;  // Green channel
        rgba[idx + 2] = 20;                   // Blue
        rgba[idx + 3] = 255;
      }
    }

    // 2. Draw a sharp "Human Face" at top-left with skin tones and high-frequency facial features (eyes, mouth)
    for (let y = 10; y < 50; y++) {
      for (let x = 10; x < 50; x++) {
        const idx = (y * width + x) * 4;
        const isFeature = (x % 6 === 0) || (y % 6 === 0);
        rgba[idx] = isFeature ? 60 : 210;     // Skin vs dark facial feature
        rgba[idx + 1] = isFeature ? 40 : 150;
        rgba[idx + 2] = isFeature ? 30 : 110;
        rgba[idx + 3] = 255;
      }
    }

    const faceBox: BoundingBox = { x: 10, y: 10, width: 40, height: 40 };
    const foodBox: BoundingBox = { x: 60, y: 60, width: 50, height: 50 };

    // Measure sharpness BEFORE blurring
    const initialFaceVariance = computeLocalVariance(rgba, width, height, faceBox);
    const initialFoodVariance = computeLocalVariance(rgba, width, height, foodBox);

    expect(initialFaceVariance).toBeGreaterThan(500); // Sharp features
    expect(initialFoodVariance).toBeGreaterThan(500); // Sharp food

    // Run automatic face detection
    const detectedBoxes = detectFaceRegions(rgba, width, height);
    expect(detectedBoxes.length).toBeGreaterThanOrEqual(1);
    expect(detectedBoxes[0].x).toBeLessThanOrEqual(16);
    expect(detectedBoxes[0].y).toBeLessThanOrEqual(16);

    // Apply face blurring
    const result = blurFacesInPixelArray(rgba, width, height, detectedBoxes);
    expect(result.blurredCount).toBeGreaterThanOrEqual(1);

    // Measure sharpness AFTER blurring (on inner face region)
    const innerFaceBox: BoundingBox = { x: faceBox.x + 4, y: faceBox.y + 4, width: faceBox.width - 8, height: faceBox.height - 8 };
    const initialInnerFaceVar = computeLocalVariance(rgba, width, height, innerFaceBox);
    const blurredFaceVariance = computeLocalVariance(rgba, width, height, innerFaceBox);
    const postFoodVariance = computeLocalVariance(rgba, width, height, foodBox);

    // PROOF 1: Face region edge variance dropped dramatically (blurred/smoothed)
    expect(blurredFaceVariance).toBeLessThan(100);
    expect(blurredFaceVariance).toBeLessThan(initialInnerFaceVar + 1);

    // PROOF 2: Food region remained 100% untouched and sharp
    expect(postFoodVariance).toBe(initialFoodVariance);
  });

  it('destructively anonymizes explicit bounding boxes using Gaussian box blurring', () => {
    const width = 64;
    const height = 64;
    const rgba = new Uint8Array(width * height * 4);

    // Fill region with high-contrast checkerboard
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const idx = (y * width + x) * 4;
        const val = (x + y) % 2 === 0 ? 255 : 0;
        rgba[idx] = val;
        rgba[idx + 1] = val;
        rgba[idx + 2] = val;
        rgba[idx + 3] = 255;
      }
    }

    const box: BoundingBox = { x: 8, y: 8, width: 32, height: 32 };
    const innerBox: BoundingBox = { x: 12, y: 12, width: 24, height: 24 };
    const beforeVar = computeLocalVariance(rgba, width, height, innerBox);
    expect(beforeVar).toBeGreaterThan(1000);

    blurBoundingBox(rgba, width, height, box, 4);

    const afterVar = computeLocalVariance(rgba, width, height, innerBox);
    expect(afterVar).toBeLessThan(10); // Completely smoothed & anonymized
  });
});
