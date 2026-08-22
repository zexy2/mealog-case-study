import { questionText } from "./strings";
import type { MealLog, ResolvedItem } from "./types";
import { demoScenarioFor } from "./demoScenarios";

const sourceDatabase = "TURKOMP";

const nutrients = (kcal: number, protein_g: number, carb_g: number, fat_g: number) => ({
  kcal,
  protein_g,
  carb_g,
  fat_g,
});

const reviewItem: ResolvedItem = {
  query: "pilav",
  food_id: "tr.pilav",
  candidates: [
    { food_id: "tr.pilav", name: "Sade pirinc pilavi", score: 0.92 },
    { food_id: "tr.mercimek_corbasi", name: "Mercimek corbasi", score: 0.41 },
    { food_id: "tr.yaprak_sarma", name: "Zeytinyagli yaprak sarma", score: 0.32 },
  ],
  grams: 180,
  grams_p10: 140,
  grams_p90: 230,
  confidence: 0.78,
  nutrients: nutrients(272, 5.4, 50.4, 5.6),
  source_database: sourceDatabase,
};

const autoItem: ResolvedItem = {
  query: "simit",
  food_id: "tr.simit",
  candidates: [{ food_id: "tr.simit", name: "Simit", score: 0.96 }],
  grams: 100,
  grams_p10: 85,
  grams_p90: 120,
  confidence: 0.94,
  nutrients: nutrients(329, 9.5, 57, 6.6),
  source_database: sourceDatabase,
};

const reviewCountItem: ResolvedItem = {
  ...autoItem,
  quantity: null,
  unit: "several",
  clarification: { kind: "count", unit: "adet", options: [1, 2, 3, null] },
};

const askItem: ResolvedItem = {
  query: "baked beans",
  food_id: "ABSTAIN",
  candidates: [
    { food_id: "tr.kuru_fasulye", name: "Kuru fasulye (etli)", score: 0.3 },
    { food_id: "tr.pilav", name: "Sade pirinc pilavi", score: 0.24 },
  ],
  grams: 0,
  grams_p10: 0,
  grams_p90: 0,
  confidence: 0.34,
  nutrients: nutrients(0, 0, 0, 0),
  source_database: sourceDatabase,
};

export function buildDemoMeal(text: string | undefined, idempotencyKey: string): MealLog {
  const scenario = demoScenarioFor(text);
  if (scenario === "abstain") {
    return {
      idempotency_key: idempotencyKey,
      locale: "tr",
      items: [askItem],
      totals: nutrients(0, 0, 0, 0),
      action: "ask",
      question: questionText(askItem),
      config: "V3",
      createdAt: new Date().toISOString(),
    };
  }

  if (scenario === "auto_accept") {
    return {
      idempotency_key: idempotencyKey,
      locale: "tr",
      items: [autoItem],
      totals: nutrients(329, 9.5, 57, 6.6),
      action: "auto_accept",
      question: null,
      config: "V3",
      createdAt: new Date().toISOString(),
    };
  }

  const review: MealLog = {
    idempotency_key: idempotencyKey,
    locale: "tr",
    items: [reviewCountItem],
    totals: nutrients(329, 9.5, 57, 6.6),
    action: "review",
    question: null,
    config: "V3",
    createdAt: new Date().toISOString(),
  };
  return scenario === "degraded" ? { ...review, degraded: true } : review;
}

export const initialDayMeals: MealLog[] = [
  {
    idempotency_key: "demo-breakfast",
    locale: "tr",
    items: [autoItem],
    totals: nutrients(329, 9.5, 57, 6.6),
    action: "auto_accept",
    question: null,
    config: "V3",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
  },
];
