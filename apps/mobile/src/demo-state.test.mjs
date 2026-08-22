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
const appSource = readFileSync(join(here, "../App.tsx"), "utf8");

assert.match(daySource, /meal\.items\.map\(itemName\)/, "Day title must derive from every meal item");
assert.match(daySource, /names\.join\(" · "\)/, "Day title must keep deterministic item order");
assert.match(daySource, /<Pressable[\s\S]*onPress=\{\(\) => onOpenMeal\(item\)\}/, "saved rows must open their meal");
assert.match(appSource, /function openSavedMeal\(savedMeal: MealLog\)/, "App must wire saved-meal opening");
assert.match(appSource, /current\.findIndex\(\(item\) => item\.idempotency_key === next\.idempotency_key\)/, "save must identify existing meals by idempotency key");
assert.match(appSource, /return current\.map\(\(item, index\) => \(index === existingIndex \? saved : item\)\)/, "saving existing meal must replace, not append");
assert.match(appSource, /setMeal\(null\);\n\s+setScreen\("day"\)/, "back from saved detail must return without a duplicate save");

console.log("mobile Day detail checks passed");
