/**
 * Client-Side Telemetry Dispatcher.
 *
 * Sends non-blocking, privacy-sanitized user interaction events
 * to the backend telemetry lakehouse for HITL curation and model refinement.
 *
 * All device IDs, GPS coordinates, and raw images are omitted.
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

export async function sendTelemetryEvent(
  baseUrl: string,
  payload: MobileTelemetryPayload,
): Promise<void> {
  try {
    const url = `${baseUrl.replace(/\/+$/, '')}/v1/telemetry/events`;
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Non-blocking fire-and-forget: silently ignore telemetry network drops
  }
}
