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

const { countAnswerPending, computedValuesNeedServerRefresh } = await import("./reviewState.ts");
const { dayNutritionState, nutritionPresentationForItem } = await import("./nutritionPresentation.ts");
assert.equal(countAnswerPending(meal.items[0], false), true, "an unanswered count must remain pending");
assert.equal(computedValuesNeedServerRefresh(meal.items[0], false, null), true, "pending count hides stale computed values");
assert.equal(computedValuesNeedServerRefresh(meal.items[0], true, 2), true, "numeric count waits for server recalculation");
assert.equal(computedValuesNeedServerRefresh(meal.items[0], true, null), false, "explicit uncertainty may retain the default band");
assert.equal(computedValuesNeedServerRefresh(meal.items[1], false, 1), false, "non-count items keep their server-provided band");

const manualItem = {
  ...meal.items[1],
  food_id: "USER_CUSTOM",
  portion_provenance: "manual_user_input",
  nutrients: { kcal: 350, protein_g: 0, carb_g: 0, fat_g: 0 },
};
const noteItem = {
  ...meal.items[1],
  food_id: "ABSTAIN",
  portion_provenance: "uncaloried_note",
  nutrients: { kcal: 0, protein_g: 0, carb_g: 0, fat_g: 0 },
};
assert.equal(nutritionPresentationForItem(meal.items[1]), "verified");
assert.equal(nutritionPresentationForItem(manualItem), "manual");
assert.equal(nutritionPresentationForItem(noteItem), "unavailable");
assert.deepEqual(dayNutritionState([{ ...meal, items: [manualItem] }]), { hasVerifiedMacros: false, hasLocalFallback: true });
assert.deepEqual(dayNutritionState([{ ...meal, items: [meal.items[1], manualItem] }]), { hasVerifiedMacros: true, hasLocalFallback: true });

const knownQuantityMeal = { ...meal, items: [{ ...meal.items[0], quantity: 1 }, meal.items[1]] };
const changed = buildMealCorrections(knownQuantityMeal, { 0: 120 }, { 0: "tr.simit" }, { 0: null });
assert.deepEqual(changed, [{ item_index: 0, quantity: null, unit: "adet", grams: 120 }]);

const saved = replaceSavedMeal([meal], { ...meal, totals: { ...meal.totals, kcal: 500 } });
assert.equal(saved.length, 1, "re-saving an opened meal must replace by idempotency key");
assert.equal(saved[0].totals.kcal, 500);
assert.equal(removeSavedMeal([meal], meal.idempotency_key).length, 0, "removal must delete local Day record");

const reviewSource = readFileSync(new URL("../screens/Review.tsx", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const apiSource = readFileSync(new URL("./api.ts", import.meta.url), "utf8");
assert.match(reviewSource, /clarification\.kind === "count"/);
assert.match(reviewSource, /quantityUnit/);
assert.match(reviewSource, /setQuantityEdits/);
assert.match(reviewSource, /accessibilityLabel=\{option === null/);
assert.match(reviewSource, /hasUnansweredCountClarification/);
assert.match(reviewSource, /needsPortionConfirmation/);
assert.match(reviewSource, /isSaveDisabled/);
assert.match(reviewSource, /stickyFooter/);
assert.match(reviewSource, /stepperInput/);
assert.match(reviewSource, /Math\.max\(1/);
assert.match(reviewSource, /computedValuesNeedServerRefresh/);
assert.match(reviewSource, /deferredValuesCard/);
assert.match(reviewSource, /footerHint/);
assert.match(appSource, /SafeAreaProvider/);
assert.match(apiSource, /\/v1\/meals\/correct/);
assert.doesNotMatch(apiSource, /corrections\s*\}[\s\S]*nutrients/);

const { inferImageMimeAndName } = await import("./mime.ts");
assert.deepEqual(inferImageMimeAndName("file:///var/mobile/photo.HEIC", null), { mimeType: "image/heic", fileName: "meal.heic" });
assert.deepEqual(inferImageMimeAndName("file:///var/mobile/photo.png", "image/png"), { mimeType: "image/png", fileName: "meal.png" });
assert.deepEqual(inferImageMimeAndName("file:///var/mobile/photo.webp", null), { mimeType: "image/webp", fileName: "meal.webp" });
assert.deepEqual(inferImageMimeAndName("file:///var/mobile/photo.jpg", null), { mimeType: "image/jpeg", fileName: "meal.jpg" });

const { formatLocalizedUnit, formatLocalizedProvenance } = await import("./strings.ts");
assert.equal(formatLocalizedUnit("whole"), "adet");
assert.equal(formatLocalizedUnit("serving"), "porsiyon");
assert.equal(formatLocalizedUnit("piece"), "adet");
assert.equal(formatLocalizedProvenance("catalogue_default_scaled"), "Katalog tanımı × adet");

const abstainSource = readFileSync(new URL("../screens/Abstention.tsx", import.meta.url), "utf8");
assert.match(abstainSource, /suggestDishButton/);
assert.match(abstainSource, /saveAsUncaloriedNoteButton/);
assert.match(abstainSource, /saveManualCaloriesButton/);
assert.match(abstainSource, /emptyPlateOverrideButton/);
assert.match(abstainSource, /overrideSubmitButton/);
assert.match(abstainSource, /abstainGenericMealName/);
assert.doesNotMatch(abstainSource, /rawDishName/);

const daySource = readFileSync(new URL("../screens/Day.tsx", import.meta.url), "utf8");
assert.match(daySource, /totalCarbs/);
assert.match(daySource, /totalFat/);
assert.match(daySource, /dayNutritionState/);
assert.match(daySource, /macroSummary/);
assert.match(daySource, /macrosPartial/);
assert.match(reviewSource, /nutritionPresentationForItem/);
assert.match(reviewSource, /nutritionCard/);
assert.match(reviewSource, /hasLocalNutritionEdit/);
assert.match(reviewSource, /nutritionRecalculationPending/);
assert.doesNotMatch(reviewSource, /macroPillEmoji/);
assert.doesNotMatch(reviewSource, /label=\{t\("macrosTitle"\)\}/);
assert.match(reviewSource, /itemNameWrap[\s\S]*statusBadgesRow/, "item labels must take full width before status badges");
assert.doesNotMatch(reviewSource, /statusBadgesCol/, "status badges must not squeeze the item title into a narrow side column");

console.log("mobile item clarification checks passed");
