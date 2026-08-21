import { buildDemoMeal } from "./demoData";
import { t } from "./strings";
import { MealLog, PendingCapture } from "./types";

const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
const demoMode = process.env.EXPO_PUBLIC_DEMO_MODE !== "false" || !apiUrl;
const fixtureSampleId = process.env.EXPO_PUBLIC_FIXTURE_SAMPLE_ID;

export const isDemoMode = demoMode;

export async function submitMeal(capture: PendingCapture): Promise<MealLog> {
  if (demoMode) {
    await new Promise((resolve) => setTimeout(resolve, 850));
    return buildDemoMeal(capture.text, capture.idempotencyKey);
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
