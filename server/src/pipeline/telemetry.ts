/**
 * Telemetry and continuous learning event ingestion.
 *
 * Captures anonymized user interactions (confirmations, candidate swaps,
 * portion edits, item deletions, and custom entries) to feed the
 * Human-in-the-Loop (HITL) curation queue and active learning flywheel.
 *
 * Conforms to Decision D4 (privacy/no-PII), D5 (no raw photo retention),
 * and D1/D8 (anti-hallucination closed-set guarantees).
 */

import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const TELEMETRY_DIR = join(process.cwd(), 'data', 'telemetry');
export const TELEMETRY_FILE = join(TELEMETRY_DIR, 'events.jsonl');

export type TelemetryEventType =
  | 'CONFIRMED_AS_IS'
  | 'CANDIDATE_SWAPPED'
  | 'PORTION_ADJUSTED'
  | 'ITEM_REMOVED'
  | 'CUSTOM_OVERRIDE';

export interface TelemetryItemDelta {
  readonly original_query?: string;
  readonly predicted_food_id?: string;
  readonly selected_food_id?: string;
  readonly predicted_grams?: number;
  readonly selected_grams?: number;
  readonly predicted_quantity?: number;
  readonly selected_quantity?: number;
  readonly confidence?: number;
  readonly delta_reason?: string;
}

export interface TelemetryEvent {
  readonly event_id: string;
  readonly timestamp: string;
  readonly locale: string;
  readonly idempotency_key: string;
  readonly event_type: TelemetryEventType;
  readonly input_mode: 'image' | 'text' | 'sample_id';
  readonly items: readonly TelemetryItemDelta[];
  readonly total_kcal_before?: number;
  readonly total_kcal_after?: number;
}

/**
 * Persist an anonymized telemetry event to the append-only event store.
 */
export function recordTelemetryEvent(
  event: Omit<TelemetryEvent, 'event_id' | 'timestamp'>,
  targetFile: string = TELEMETRY_FILE,
): TelemetryEvent {
  const fullEvent: TelemetryEvent = {
    event_id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    ...event,
  };

  try {
    const dir = dirname(targetFile);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    appendFileSync(targetFile, JSON.stringify(fullEvent) + '\n', 'utf8');
  } catch (err) {
    // Non-blocking telemetry failure: log and proceed
    console.error('Failed to write telemetry event:', err);
  }

  return fullEvent;
}
