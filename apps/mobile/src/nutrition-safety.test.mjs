import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const reviewSource = readFileSync(new URL("../screens/Review.tsx", import.meta.url), "utf8");
const abstentionSource = readFileSync(new URL("../screens/Abstention.tsx", import.meta.url), "utf8");
const apiSource = readFileSync(new URL("./api.ts", import.meta.url), "utf8");
const daySource = readFileSync(new URL("../screens/Day.tsx", import.meta.url), "utf8");
const mobileSource = `${appSource}\n${reviewSource}\n${abstentionSource}\n${apiSource}\n${daySource}`;

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

assert.match(apiSource, /\/v1\/meals\/estimate/);
assert.match(reviewSource, /AI tahmini — doğrulanmış katalog veya laboratuvar verisi değildir/);
assert.match(reviewSource, /Doğrulanmamış AI Tahmini/);
assert.equal(
  /Yapay Zeka Tahmini Yüklendi/.test(reviewSource),
  false,
  "an unverified estimate must not be presented as a loaded or verified answer",
);
assert.match(daySource, /AI tahmini/);
assert.match(appSource, /portion_provenance: "llm_unverified_estimate"/);
assert.equal(
  /parseInt\(newPlateItemKcal[^\n]+\)\s*\|\|\s*200/.test(reviewSource),
  false,
  "an empty manual calorie field must not silently become 200 kcal",
);

console.log("mobile nutrition safety: catalogue misses cannot invent nutrition");
