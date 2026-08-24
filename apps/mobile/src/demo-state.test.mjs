import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

process.env.EXPO_PUBLIC_DEMO_MODE = "true";
delete process.env.EXPO_PUBLIC_API_URL;

const { DEMO_SCENARIOS, demoInput, demoScenarioFor } = await import("./demoScenarios.ts");

assert.deepEqual(DEMO_SCENARIOS, ["auto_accept", "review", "abstain", "degraded", "error", "empty"]);
for (const scenario of DEMO_SCENARIOS) {
  assert.equal(demoScenarioFor(demoInput(scenario)), scenario);
}

console.log("mobile demo state checks passed");

const here = dirname(fileURLToPath(import.meta.url));
const daySource = readFileSync(join(here, "../screens/Day.tsx"), "utf8");
const reviewSource = readFileSync(join(here, "../screens/Review.tsx"), "utf8");
const abstainSource = readFileSync(join(here, "../screens/Abstention.tsx"), "utf8");
const captureSource = readFileSync(join(here, "../screens/Capture.tsx"), "utf8");
const appSource = readFileSync(join(here, "../App.tsx"), "utf8");
const apiSource = readFileSync(join(here, "./api.ts"), "utf8");
const demoDataSource = readFileSync(join(here, "./demoData.ts"), "utf8");

assert.match(demoDataSource, /const reviewItem:[\s\S]*food_id: "tr\.pilav"/, "the review demo must stay on the pilav fixture");
assert.match(demoDataSource, /items: \[reviewItem\],[\s\S]*totals: nutrients\(272, 5\.4, 50\.4, 5\.6\)/, "the review demo must preserve pilav's server-shaped macro values");
assert.doesNotMatch(demoDataSource, /items: \[reviewCountItem\]/, "the review demo must not enter the unrelated count-pending state");

assert.match(daySource, /meal\.items\.map\(itemName\)/, "Day title must derive from every meal item");
assert.match(daySource, /names\.join\(" · "\)/, "Day title must keep deterministic item order");
assert.match(daySource, /itemWithQuantity/, "Day title must preserve a known quantity");
assert.match(daySource, /itemUnknownQuantity/, "Day title must surface unknown quantity");
assert.match(daySource, /portionTotals/, "Day must aggregate p10-p90 portion evidence");
assert.match(daySource, /dayPortionRange/, "Day must render the aggregate portion range");
assert.match(daySource, /onRemoveMeal/, "Day must expose local record removal");
assert.match(daySource, /removeMealAccessibility/, "record removal must be accessible");
assert.match(daySource, /highlightedMealKey/, "auto-accepted meal must be highlighted");
assert.match(daySource, /onUndoMeal/, "auto-accepted meal must expose one-tap undo");
assert.match(reviewSource, /quantityLabel/, "Review must expose provider quantity evidence");
assert.match(reviewSource, /quantityUnknown/, "Review must surface unknown quantity");
assert.match(reviewSource, /isSaved/, "Review must distinguish an existing saved record");
assert.match(reviewSource, /portionBand/, "Review must never collapse a valid portion to a point");
assert.match(reviewSource, /capture_medium/, "Review must surface capture medium evidence");
assert.match(reviewSource, /captureMediumScreen/, "screen medium must have cause-specific copy");
assert.match(reviewSource, /captureMediumPrinted/, "printed medium must have cause-specific copy");
assert.match(reviewSource, /captureMediumToy/, "toy medium must have cause-specific copy");
assert.match(reviewSource, /captureMediumUnclear/, "unclear medium must have cause-specific copy");
assert.match(reviewSource, /expandedItem === index/, "Review must expose the audit panel state");
assert.match(abstainSource, /onDescribe/, "abstention must offer a typed description path");
assert.match(captureSource, /demoAutoAccept/, "demo mode must expose auto-accept");
assert.match(captureSource, /demoDegraded/, "demo mode must expose degraded review");
assert.match(daySource, /<Pressable[\s\S]*onPress=\{\(\) => onOpenMeal\(item\)\}/, "saved rows must open their meal");
assert.match(appSource, /function openSavedMeal\(savedMeal: MealLog\)/, "App must wire saved-meal opening");
assert.match(appSource, /Alert\.alert\(/, "record removal must have an explicit confirmation step");
assert.match(appSource, /removeSavedMeal/, "removal must update local Day state");
assert.match(appSource, /current\.findIndex\(\(item\) => item\.idempotency_key === next\.idempotency_key\)/, "save must identify existing meals by idempotency key");
assert.match(appSource, /return current\.map\(\(item, index\) => \(index === existingIndex \? saved : item\)\)/, "saving existing meal must replace, not append");
assert.match(appSource, /setMeal\(null\);\n\s+setScreen\("day"\)/, "back from saved detail must return without a duplicate save");
assert.match(
  appSource,
  /result\.action === "auto_accept" && !result\.degraded/,
  "degraded API results must not take the auto-accept path",
);
assert.match(
  appSource,
  /result\.action === "ask" && \(result\.items\.length === 0 \|\| result\.items\.some\(\(item\) => item\.food_id === "ABSTAIN"\)\)/,
  "abstention routing must use the server item sentinel or empty plate",
);

assert.match(appSource, /setHighlightedMealKey\(result\.idempotency_key\)/, "auto-accept must highlight the returned record");
assert.match(appSource, /setScreen\("capture"\)/, "abstention and provider failures must return to Add");
assert.match(
  reviewSource,
  /const displayAction = meal\.degraded \? "review" : meal\.action/,
  "degraded results must render as review in the mobile audit surface",
);
assert.match(apiSource, /response\.status === 503/, "provider 503 must have a distinct client error path");
assert.match(apiSource, /providerUnavailable/, "provider failure must use deliberate copy");

console.log("mobile Day detail checks passed");
