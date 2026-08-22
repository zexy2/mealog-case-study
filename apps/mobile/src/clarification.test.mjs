import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { buildMealCorrections, removeSavedMeal, replaceSavedMeal } = await import("./corrections.ts");

const meal = {
  idempotency_key: "mobile-correction-test",
  locale: "tr",
  items: [
    {
      query: "simit",
      food_id: "tr.simit",
      candidates: [{ food_id: "tr.simit", name: "Simit", score: 1 }],
      quantity: null,
      unit: "several",
      clarification: { kind: "count", unit: "adet", options: [1, 2, 3, null] },
      grams: 100,
      grams_p10: 65,
      grams_p90: 145,
      confidence: 1,
      nutrients: { kcal: 329, protein_g: 9.5, carb_g: 57, fat_g: 6.6 },
    },
    {
      query: "ayran",
      food_id: "tr.ayran",
      candidates: [{ food_id: "tr.ayran", name: "Ayran", score: 1 }],
      quantity: 1,
      unit: "serving",
      grams: 200,
      grams_p10: 150,
      grams_p90: 270,
      confidence: 1,
      nutrients: { kcal: 74, protein_g: 4, carb_g: 5, fat_g: 3 },
    },
  ],
  totals: { kcal: 403, protein_g: 13.5, carb_g: 62, fat_g: 9.6 },
  action: "review",
  config: "V3",
};

const corrections = buildMealCorrections(meal, {}, {}, { 0: 2 });
assert.deepEqual(corrections, [{ item_index: 0, quantity: 2, unit: "adet" }]);
assert.equal("nutrients" in corrections[0], false, "mobile must never send client nutrients");

const knownQuantityMeal = { ...meal, items: [{ ...meal.items[0], quantity: 1 }, meal.items[1]] };
const changed = buildMealCorrections(knownQuantityMeal, { 0: 120 }, { 0: "tr.simit" }, { 0: null });
assert.deepEqual(changed, [{ item_index: 0, quantity: null, unit: "adet", grams: 120 }]);

const saved = replaceSavedMeal([meal], { ...meal, totals: { ...meal.totals, kcal: 500 } });
assert.equal(saved.length, 1, "re-saving an opened meal must replace by idempotency key");
assert.equal(saved[0].totals.kcal, 500);
assert.equal(removeSavedMeal([meal], meal.idempotency_key).length, 0, "removal must delete local Day record");

const reviewSource = readFileSync(new URL("../screens/Review.tsx", import.meta.url), "utf8");
const apiSource = readFileSync(new URL("./api.ts", import.meta.url), "utf8");
assert.match(reviewSource, /clarification\.kind === "count"/);
assert.match(reviewSource, /quantityUnit/);
assert.match(reviewSource, /setQuantityEdits/);
assert.match(reviewSource, /accessibilityLabel=\{option === null/);
assert.match(reviewSource, /portionProvenance/);
assert.match(apiSource, /\/v1\/meals\/correct/);
assert.doesNotMatch(apiSource, /corrections\s*\}[\s\S]*nutrients/);

console.log("mobile item clarification checks passed");
