/**
 * Correction telemetry event ingestion.
 *
 * Captures privacy-minimized user interactions (confirmations, candidate
 * swaps, portion edits, item deletions, and custom entries) for later human
 * curation. This prototype appends local JSONL; it does not train or promote
 * a model automatically.
 *
 * Conforms to Decision D4 (privacy/no-PII), D5 (no raw photo retention),
 * and D1/D8 (anti-hallucination closed-set guarantees).
 */

import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';

import { sanitizePiiText } from './privacy';

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
  readonly request_hash: string;
  readonly event_type: TelemetryEventType;
  readonly input_mode: 'image' | 'text' | 'sample_id';
  readonly items: readonly TelemetryItemDelta[];
  readonly total_kcal_before?: number;
  readonly total_kcal_after?: number;
}

export interface TelemetryEventInput extends Omit<TelemetryEvent, 'event_id' | 'timestamp' | 'request_hash'> {
  readonly idempotency_key: string;
}

function privacySafeText(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return sanitizePiiText(value).slice(0, 512);
}

/**
 * Persist an anonymized telemetry event to the append-only event store.
 */
export function recordTelemetryEvent(
  event: TelemetryEventInput,
  targetFile: string = TELEMETRY_FILE,
): TelemetryEvent {
  const { idempotency_key, ...eventWithoutRawKey } = event;
  const fullEvent: TelemetryEvent = {
    event_id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    ...eventWithoutRawKey,
    request_hash: createHash('sha256').update(idempotency_key).digest('hex'),
    locale: privacySafeText(event.locale)?.slice(0, 32) ?? 'unknown',
    items: event.items.map((item) => ({
      ...item,
      original_query: privacySafeText(item.original_query),
      predicted_food_id: privacySafeText(item.predicted_food_id)?.slice(0, 128),
      selected_food_id: privacySafeText(item.selected_food_id)?.slice(0, 128),
      delta_reason: privacySafeText(item.delta_reason),
    })),
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
