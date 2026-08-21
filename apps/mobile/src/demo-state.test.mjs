import assert from "node:assert/strict";

process.env.EXPO_PUBLIC_DEMO_MODE = "true";
delete process.env.EXPO_PUBLIC_API_URL;

const { DEMO_SCENARIOS, demoInput, demoScenarioFor } = await import("./demoScenarios.ts");

assert.deepEqual(DEMO_SCENARIOS, ["review", "abstain", "error", "empty"]);
for (const scenario of DEMO_SCENARIOS) {
  assert.equal(demoScenarioFor(demoInput(scenario)), scenario);
}

console.log("mobile demo state checks passed");
