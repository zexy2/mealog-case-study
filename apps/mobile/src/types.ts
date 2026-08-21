export type MealAction = "auto_accept" | "review" | "ask";

export type Candidate = {
  food_id: string;
  name: string;
  score: number;
};

export type Nutrients = {
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
};

export type ResolvedItem = {
  query: string;
  food_id: string;
  candidates: Candidate[];
  grams: number;
  grams_p10: number;
  grams_p90: number;
  confidence: number;
  nutrients: Nutrients;
  source_database?: string;
};

export type MealLog = {
  idempotency_key: string;
  locale: string;
  items: ResolvedItem[];
  totals: Nutrients;
  action: MealAction;
  question?: string | null;
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
