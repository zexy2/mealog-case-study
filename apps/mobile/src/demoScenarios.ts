import type { DemoScenario } from "./types";

export const DEMO_SCENARIOS = ["auto_accept", "review", "abstain", "degraded", "error", "empty"] as const satisfies readonly DemoScenario[];

const DEMO_INPUTS: Record<DemoScenario, string> = {
  review: "pilav",
  auto_accept: "simit",
  abstain: "baked beans",
  error: "provider error",
  empty: "empty day",
  degraded: "degraded result",
};

export function demoInput(scenario: DemoScenario): string {
  return DEMO_INPUTS[scenario];
}

export function demoScenarioFor(text: string | undefined): DemoScenario {
  const prompt = (text ?? "").trim().toLowerCase();
  if (prompt.includes("empty")) return "empty";
  if (prompt.includes("error") || prompt.includes("fail") || prompt.includes("provider")) return "error";
  if (prompt.includes("degraded")) return "degraded";
  if (prompt.includes("ask") || prompt.includes("mystery") || prompt.includes("baked") || prompt.includes("abstain")) return "abstain";
  if (prompt.includes("quick") || prompt.includes("auto") || prompt.includes("simit")) return "auto_accept";
  return "review";
}
