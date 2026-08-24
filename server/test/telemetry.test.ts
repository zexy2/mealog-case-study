import { describe, expect, it } from 'vitest';
import { readFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { recordTelemetryEvent, TelemetryEvent } from '../src/pipeline/telemetry';

describe('Telemetry & Continuous Learning Pipeline', () => {
  const testTelemetryFile = join(process.cwd(), 'data', 'telemetry', 'test_events.jsonl');

  it('records a candidate swapped event with proper fields', () => {
    if (existsSync(testTelemetryFile)) {
      unlinkSync(testTelemetryFile);
    }

    const event = recordTelemetryEvent(
      {
        locale: 'tr',
        idempotency_key: 'test_idemp_swap',
        event_type: 'CANDIDATE_SWAPPED',
        input_mode: 'image',
        items: [
          {
            original_query: 'pilav',
            predicted_food_id: 'tr.pilav',
            selected_food_id: 'tr.bulgur_pilavi',
            predicted_grams: 180,
            selected_grams: 180,
            delta_reason: 'user_swapped_to_bulgur',
          },
        ],
        total_kcal_before: 272,
        total_kcal_after: 268,
      },
      testTelemetryFile,
    );

    expect(event.event_id).toMatch(/^evt_/);
    expect(event.timestamp).toBeDefined();
    expect(event.event_type).toBe('CANDIDATE_SWAPPED');

    const content = readFileSync(testTelemetryFile, 'utf8');
    const parsed = JSON.parse(content.trim()) as TelemetryEvent;
    expect(parsed.idempotency_key).toBe('test_idemp_swap');
    expect(parsed.items[0].predicted_food_id).toBe('tr.pilav');
    expect(parsed.items[0].selected_food_id).toBe('tr.bulgur_pilavi');

    if (existsSync(testTelemetryFile)) {
      unlinkSync(testTelemetryFile);
    }
  });

  it('records a portion adjusted event with mass delta', () => {
    const event = recordTelemetryEvent(
      {
        locale: 'tr',
        idempotency_key: 'test_idemp_portion',
        event_type: 'PORTION_ADJUSTED',
        input_mode: 'image',
        items: [
          {
            original_query: 'izgara kofte',
            predicted_food_id: 'tr.kofte_izgara',
            selected_food_id: 'tr.kofte_izgara',
            predicted_grams: 150,
            selected_grams: 225,
            delta_reason: 'user_slider_increase',
          },
        ],
        total_kcal_before: 327,
        total_kcal_after: 490,
      },
      testTelemetryFile,
    );

    expect(event.event_type).toBe('PORTION_ADJUSTED');
    expect(event.total_kcal_after).toBe(490);

    if (existsSync(testTelemetryFile)) {
      unlinkSync(testTelemetryFile);
    }
  });
});
