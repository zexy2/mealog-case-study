import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const reviewSource = readFileSync(new URL("../screens/Review.tsx", import.meta.url), "utf8");
const abstentionSource = readFileSync(new URL("../screens/Abstention.tsx", import.meta.url), "utf8");
const mobileSource = `${appSource}\n${reviewSource}\n${abstentionSource}`;

for (const forbidden of [
  "getSmartItemLlmEstimate",
  "getLlmEstimate",
  "getCombinedLlmEstimate",
  "handleAcceptLlmEstimate",
  "onAcceptLlmEstimate",
  "llm_generative_estimate",
  "Yapay Zeka (LLM) Tahmini",
]) {
  assert.equal(
    mobileSource.includes(forbidden),
    false,
    `catalogue misses must not create client-side nutrition via ${forbidden}`,
  );
}

assert.equal(
  /parseInt\(customCaloriesInput[^\n]+\)\s*\|\|\s*250/.test(reviewSource),
  false,
  "an empty manual calorie field must not silently become 250 kcal",
);
assert.equal(
  /parseInt\(newPlateItemKcal[^\n]+\)\s*\|\|\s*200/.test(reviewSource),
  false,
  "an empty manual calorie field must not silently become 200 kcal",
);

console.log("mobile nutrition safety: catalogue misses cannot invent nutrition");
