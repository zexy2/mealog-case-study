"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const privacy_1 = require("../src/pipeline/privacy");
(0, vitest_1.describe)('Face Detection, Privacy Blurring & Mathematical Sharpness Verification', () => {
    (0, vitest_1.it)('correctly classifies human skin chrominance in YCbCr space', () => {
        // Typical human skin RGB tones (Caucasian, Asian, African skin tones)
        (0, vitest_1.expect)((0, privacy_1.isSkinPixel)(230, 180, 150)).toBe(true); // Light skin
        (0, vitest_1.expect)((0, privacy_1.isSkinPixel)(190, 130, 90)).toBe(true); // Medium olive skin
        (0, vitest_1.expect)((0, privacy_1.isSkinPixel)(110, 70, 45)).toBe(true); // Dark skin
        // Non-skin colors (green vegetables, blue backgrounds, white plates)
        (0, vitest_1.expect)((0, privacy_1.isSkinPixel)(34, 139, 34)).toBe(false); // Forest Green (Salad)
        (0, vitest_1.expect)((0, privacy_1.isSkinPixel)(0, 0, 255)).toBe(false); // Blue
        (0, vitest_1.expect)((0, privacy_1.isSkinPixel)(255, 255, 255)).toBe(false); // White plate
        (0, vitest_1.expect)((0, privacy_1.isSkinPixel)(10, 10, 10)).toBe(false); // Black table
    });
    (0, vitest_1.it)('detects a human face region and blurs only the face while preserving surrounding food', () => {
        const width = 120;
        const height = 120;
        const rgba = new Uint8Array(width * height * 4);
        // 1. Draw a sharp "Food Plate" at bottom-right (green salad with red tomato pattern)
        for (let y = 60; y < 110; y++) {
            for (let x = 60; x < 110; x++) {
                const idx = (y * width + x) * 4;
                const isTomato = (x + y) % 4 === 0;
                rgba[idx] = isTomato ? 220 : 34; // Red / Green
                rgba[idx + 1] = isTomato ? 40 : 160; // Green channel
                rgba[idx + 2] = 20; // Blue
                rgba[idx + 3] = 255;
            }
        }
        // 2. Draw a sharp "Human Face" at top-left with skin tones and high-frequency facial features (eyes, mouth)
        for (let y = 10; y < 50; y++) {
            for (let x = 10; x < 50; x++) {
                const idx = (y * width + x) * 4;
                const isFeature = (x % 6 === 0) || (y % 6 === 0);
                rgba[idx] = isFeature ? 60 : 210; // Skin vs dark facial feature
                rgba[idx + 1] = isFeature ? 40 : 150;
                rgba[idx + 2] = isFeature ? 30 : 110;
                rgba[idx + 3] = 255;
            }
        }
        const faceBox = { x: 10, y: 10, width: 40, height: 40 };
        const foodBox = { x: 60, y: 60, width: 50, height: 50 };
        // Measure sharpness BEFORE blurring
        const initialFaceVariance = (0, privacy_1.computeLocalVariance)(rgba, width, height, faceBox);
        const initialFoodVariance = (0, privacy_1.computeLocalVariance)(rgba, width, height, foodBox);
        (0, vitest_1.expect)(initialFaceVariance).toBeGreaterThan(500); // Sharp features
        (0, vitest_1.expect)(initialFoodVariance).toBeGreaterThan(500); // Sharp food
        // Run automatic face detection
        const detectedBoxes = (0, privacy_1.detectFaceRegions)(rgba, width, height);
        (0, vitest_1.expect)(detectedBoxes.length).toBeGreaterThanOrEqual(1);
        (0, vitest_1.expect)(detectedBoxes[0].x).toBeLessThanOrEqual(16);
        (0, vitest_1.expect)(detectedBoxes[0].y).toBeLessThanOrEqual(16);
        // Apply face blurring
        const result = (0, privacy_1.blurFacesInPixelArray)(rgba, width, height, detectedBoxes);
        (0, vitest_1.expect)(result.blurredCount).toBeGreaterThanOrEqual(1);
        // Measure sharpness AFTER blurring (on inner face region)
        const innerFaceBox = { x: faceBox.x + 4, y: faceBox.y + 4, width: faceBox.width - 8, height: faceBox.height - 8 };
        const initialInnerFaceVar = (0, privacy_1.computeLocalVariance)(rgba, width, height, innerFaceBox);
        const blurredFaceVariance = (0, privacy_1.computeLocalVariance)(rgba, width, height, innerFaceBox);
        const postFoodVariance = (0, privacy_1.computeLocalVariance)(rgba, width, height, foodBox);
        // PROOF 1: Face region edge variance dropped dramatically (blurred/smoothed)
        (0, vitest_1.expect)(blurredFaceVariance).toBeLessThan(100);
        (0, vitest_1.expect)(blurredFaceVariance).toBeLessThan(initialInnerFaceVar + 1);
        // PROOF 2: Food region remained 100% untouched and sharp
        (0, vitest_1.expect)(postFoodVariance).toBe(initialFoodVariance);
    });
    (0, vitest_1.it)('destructively anonymizes explicit bounding boxes using Gaussian box blurring', () => {
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
        const box = { x: 8, y: 8, width: 32, height: 32 };
        const innerBox = { x: 12, y: 12, width: 24, height: 24 };
        const beforeVar = (0, privacy_1.computeLocalVariance)(rgba, width, height, innerBox);
        (0, vitest_1.expect)(beforeVar).toBeGreaterThan(1000);
        (0, privacy_1.blurBoundingBox)(rgba, width, height, box, 4);
        const afterVar = (0, privacy_1.computeLocalVariance)(rgba, width, height, innerBox);
        (0, vitest_1.expect)(afterVar).toBeLessThan(10); // Completely smoothed & anonymized
    });
});
//# sourceMappingURL=face_blurring.test.js.map