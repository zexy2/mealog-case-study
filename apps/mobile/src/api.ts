import { buildDemoMeal } from "./demoData";
import { demoScenarioFor } from "./demoScenarios";
import { t } from "./strings";
import { MealCorrection, MealLog, PendingCapture } from "./types";

const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
const demoMode = process.env.EXPO_PUBLIC_DEMO_MODE !== "false" || !apiUrl;
const fixtureSampleId = process.env.EXPO_PUBLIC_FIXTURE_SAMPLE_ID;

export const isDemoMode = demoMode;

export type SubmitOptions = {
  demoRetry?: boolean;
};

export async function submitMeal(capture: PendingCapture, options: SubmitOptions = {}): Promise<MealLog> {
  if (demoMode) {
    await new Promise((resolve) => setTimeout(resolve, 850));
    if (demoScenarioFor(capture.text) === "error" && !options.demoRetry) {
      throw new Error(t("demoProviderError"));
    }
    return buildDemoMeal(options.demoRetry ? "pilav" : capture.text, capture.idempotencyKey);
  }

  if (!apiUrl) {
    throw new Error(t("apiUrlMissing"));
  }

  const response = capture.photo
    ? await submitPhoto(capture)
    : await submitText(capture);

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `${t("uploadFailed")} (${response.status})`);
  }
  return response.json() as Promise<MealLog>;
}

export async function correctMeal(meal: MealLog, corrections: MealCorrection[]): Promise<MealLog> {
  if (demoMode) {
    throw new Error(t("correctionNeedsServer"));
  }

  const response = await fetch(`${apiUrl}/v1/meals/correct`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ meal, corrections }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `${t("correctionFailed")} (${response.status})`);
  }
  return response.json() as Promise<MealLog>;
}

async function submitText(capture: PendingCapture): Promise<Response> {
  return fetch(`${apiUrl}/v1/meals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      idempotency_key: capture.idempotencyKey,
      locale: "tr",
      config: "V3",
      text: capture.text,
      ...(fixtureSampleId ? { sample_id: fixtureSampleId } : {}),
    }),
  });
}

async function submitPhoto(capture: PendingCapture): Promise<Response> {
  const form = new FormData();
  form.append("idempotency_key", capture.idempotencyKey);
  form.append("locale", "tr");
  form.append("config", "V3");
  form.append("image", {
    uri: capture.photo?.uri,
    type: capture.photo?.mimeType || "image/jpeg",
    name: "meal.jpg",
  } as unknown as Blob);

  return fetch(`${apiUrl}/v1/meals`, {
    method: "POST",
    body: form,
  });
}
