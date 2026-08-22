import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

process.env.EXPO_PUBLIC_DEMO_MODE = "true";
delete process.env.EXPO_PUBLIC_API_URL;

const { DEMO_SCENARIOS, demoInput, demoScenarioFor } = await import("./demoScenarios.ts");

assert.deepEqual(DEMO_SCENARIOS, ["review", "abstain", "error", "empty"]);
for (const scenario of DEMO_SCENARIOS) {
  assert.equal(demoScenarioFor(demoInput(scenario)), scenario);
}

console.log("mobile demo state checks passed");

const here = dirname(fileURLToPath(import.meta.url));
const daySource = readFileSync(join(here, "../screens/Day.tsx"), "utf8");
const reviewSource = readFileSync(join(here, "../screens/Review.tsx"), "utf8");
const appSource = readFileSync(join(here, "../App.tsx"), "utf8");

assert.match(daySource, /meal\.items\.map\(itemName\)/, "Day title must derive from every meal item");
assert.match(daySource, /names\.join\(" · "\)/, "Day title must keep deterministic item order");
assert.match(daySource, /itemWithQuantity/, "Day title must preserve a known quantity");
assert.match(daySource, /itemUnknownQuantity/, "Day title must surface unknown quantity");
assert.match(daySource, /portionTotals/, "Day must aggregate p10-p90 portion evidence");
assert.match(daySource, /dayPortionRange/, "Day must render the aggregate portion range");
assert.match(daySource, /onRemoveMeal/, "Day must expose local record removal");
assert.match(daySource, /removeMealAccessibility/, "record removal must be accessible");
assert.match(reviewSource, /quantityLabel/, "Review must expose provider quantity evidence");
assert.match(reviewSource, /quantityUnknown/, "Review must surface unknown quantity");
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
  reviewSource,
  /const displayAction = meal\.degraded \? "review" : meal\.action/,
  "degraded results must render as review in the mobile audit surface",
);

console.log("mobile Day detail checks passed");
