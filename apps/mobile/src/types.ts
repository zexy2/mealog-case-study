export type MealAction = "auto_accept" | "review" | "ask";

export type DemoScenario = "review" | "auto_accept" | "abstain" | "error" | "empty" | "degraded";

export type Candidate = {
  food_id: string;
  name: string;
  score: number;
};

export type ClarificationKind = "count" | "identity" | "portion";

export type ItemClarification = {
  kind: ClarificationKind;
  unit: string | null;
  options: Array<number | null>;
};

export type CaptureMedium = "real_plate" | "screen" | "printed" | "toy_or_model" | "unclear";

export type Nutrients = {
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
};

export type NutritionRange = {
  low: number;
  midpoint: number;
  high: number;
};

export type UnverifiedNutritionEstimate = {
  dish_name: string;
  kcal: NutritionRange;
  protein_g: NutritionRange;
  carb_g: NutritionRange;
  fat_g: NutritionRange;
  assumptions: string[];
  provenance: "llm_unverified_estimate";
  model_id: string;
};

export type ResolvedItem = {
  query: string;
  food_id: string;
  candidates: Candidate[];
  quantity?: number | null;
  unit?: string | null;
  grams: number;
  grams_p10: number;
  grams_p90: number;
  confidence: number;
  /** Optional for old saved records; missing is the neutral real_plate path. */
  capture_medium?: CaptureMedium;
  nutrients: Nutrients;
  source_database?: string;
  portion_source?: string;
  portion_provenance?: string;
  nutrition_estimate?: UnverifiedNutritionEstimate;
  clarification?: ItemClarification | null;
};

export type MealLog = {
  idempotency_key: string;
  locale: string;
  items: ResolvedItem[];
  totals: Nutrients;
  action: MealAction;
  question?: string | null;
  degraded?: boolean;
  config: string;
  createdAt?: string;
};

export type PhotoCapture = {
  uri: string;
  mimeType?: string | null;
};

export type PendingCapture = {
  idempotencyKey: string;
  photo?: PhotoCapture;
  text?: string;
};

export type MealCorrection = {
  item_index: number;
  food_id?: string;
  quantity?: number | null;
  unit?: string | null;
  grams?: number;
};
