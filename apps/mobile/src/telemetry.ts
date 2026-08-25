/**
 * Client-Side Telemetry Dispatcher.
 *
 * Sends non-blocking user interaction events to the configured backend.
 * The server performs the authoritative redaction and correlation hashing
 * before appending an event to the local prototype store.
 *
 * Raw images and location are omitted. A pseudonymous client ID is sent only
 * as a rate-limit header; the server does not persist it in the event row.
 */

export interface MobileTelemetryPayload {
  readonly idempotency_key: string;
  readonly locale: string;
  readonly event_type:
    | 'CONFIRMED_AS_IS'
    | 'CANDIDATE_SWAPPED'
    | 'PORTION_ADJUSTED'
    | 'ITEM_REMOVED'
    | 'CUSTOM_OVERRIDE';
  readonly input_mode: 'image' | 'text' | 'sample_id';
  readonly items: readonly {
    readonly original_query?: string;
    readonly predicted_food_id?: string;
    readonly selected_food_id?: string;
    readonly predicted_grams?: number;
    readonly selected_grams?: number;
    readonly delta_reason?: string;
  }[];
  readonly total_kcal_before?: number;
  readonly total_kcal_after?: number;
}

export function telemetryEventTypeForEdits(
  hasCandidateEdit: boolean,
  hasPortionOrQuantityEdit: boolean,
): MobileTelemetryPayload["event_type"] {
  if (hasCandidateEdit) return "CANDIDATE_SWAPPED";
  if (hasPortionOrQuantityEdit) return "PORTION_ADJUSTED";
  return "CONFIRMED_AS_IS";
}

export function buildTelemetryRequest(
  baseUrl: string,
  userId: string,
  payload: MobileTelemetryPayload,
): { url: string; init: RequestInit } {
  return {
    url: `${baseUrl.replace(/\/+$/, '')}/v1/telemetry/events`,
    init: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      },
      body: JSON.stringify(payload),
    },
  };
}

export async function sendTelemetryEvent(
  baseUrl: string,
  userId: string,
  payload: MobileTelemetryPayload,
): Promise<void> {
  try {
    const request = buildTelemetryRequest(baseUrl, userId, payload);
    await fetch(request.url, request.init);
  } catch {
    // Non-blocking fire-and-forget: silently ignore telemetry network drops
  }
}
