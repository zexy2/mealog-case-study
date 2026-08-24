/**
 * Unit tests for the observability primitives.
 *
 * These assert the properties that make a log line useful rather than the
 * wording of any message: that a request id is present and scoped, that levels
 * are actually filtered, that stage timings are recorded, and that the metrics
 * snapshot is a shape a reader can act on. Asserting on exact strings would
 * make every future field addition a test failure for no safety gained.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  configure,
  currentRequestId,
  event,
  log,
  metrics,
  newRequestId,
  stage,
  stageAsync,
  withRequestId,
} from '../src/obs';

interface Line {
  readonly ts: string;
  readonly level: string;
  readonly msg: string;
  readonly request_id: string;
  readonly [key: string]: unknown;
}

let lines: Line[];

beforeEach(() => {
  lines = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
    lines.push(JSON.parse(String(chunk)) as Line);
    return true;
  });
  metrics.reset();
  configure('info');
});

afterEach(() => {
  vi.restoreAllMocks();
  configure('info');
});

describe('log lines', () => {
  it('emits one JSON object per line', () => {
    event('probe', { config: 'V3' });

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ level: 'INFO', msg: 'probe', config: 'V3' });
  });

  it('stamps every line with an ISO timestamp', () => {
    event('probe');

    expect(new Date(lines[0].ts).toISOString()).toBe(lines[0].ts);
  });

  it('marks lines emitted outside a request so they are never mistaken for one', () => {
    event('probe');

    expect(lines[0].request_id).toBe('-');
    expect(currentRequestId()).toBe('-');
  });

  it('drops records below the configured level', () => {
    configure('warn');

    log.info('quiet');
    log.error('loud');

    expect(lines.map((line) => line.msg)).toEqual(['loud']);
  });

  it('treats an unknown level name as info rather than silencing the service', () => {
    configure('not-a-level');

    log.info('kept');

    expect(lines.map((line) => line.msg)).toEqual(['kept']);
  });
});

describe('request id propagation', () => {
  it('attaches the id to every line inside the scope', () => {
    withRequestId('req-1', () => {
      event('first');
      event('second');
    });

    expect(lines.map((line) => line.request_id)).toEqual(['req-1', 'req-1']);
  });

  it('does not leak the id after the scope ends', () => {
    withRequestId('req-1', () => event('inside'));
    event('outside');

    expect(lines[1].request_id).toBe('-');
  });

  it('keeps concurrent requests apart across await points', async () => {
    const work = (id: string) =>
      withRequestId(id, async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        event('done', { who: id });
      });

    await Promise.all([work('req-a'), work('req-b')]);

    const seen = new Map(lines.map((line) => [line.who as string, line.request_id]));
    expect(seen.get('req-a')).toBe('req-a');
    expect(seen.get('req-b')).toBe('req-b');
  });

  it('generates ids that are short enough to read and distinct enough to trust', () => {
    const ids = new Set(Array.from({ length: 500 }, () => newRequestId()));

    expect(ids.size).toBe(500);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{12}$/);
  });
});

describe('stage timing', () => {
  it('records a duration and the caller-supplied identity fields', () => {
    stage('retrieval', () => 42, { config: 'V3', provider: 'fixture' });

    expect(lines[0]).toMatchObject({
      msg: 'stage',
      stage: 'retrieval',
      config: 'V3',
      provider: 'fixture',
    });
    expect(typeof lines[0].duration_ms).toBe('number');
  });

  it('returns the wrapped value untouched', async () => {
    expect(stage('sync', () => 'value')).toBe('value');
    await expect(stageAsync('async', () => Promise.resolve('value'))).resolves.toBe('value');
  });


  it('still records a timing when the stage throws, so failures are not invisible', async () => {
    expect(() => stage('boom', () => {
      throw new Error('nope');
    })).toThrow('nope');

    await expect(
      stageAsync('boom-async', () => Promise.reject(new Error('nope'))),
    ).rejects.toThrow('nope');

    expect(lines.filter((line) => line.msg === 'stage')).toHaveLength(2);

    expect(metrics.snapshot().stage_latency.boom.count).toBe(1);
  });

  it('measures the awaited work, not just the call that starts it', async () => {
    await stageAsync('slow', () => new Promise((resolve) => setTimeout(resolve, 20)));

    expect(lines[0].duration_ms as number).toBeGreaterThanOrEqual(15);
  });
});

describe('metrics snapshot', () => {
  it('counts requests per route and status', () => {
    metrics.observeRequest('POST /v1/meals', 200, 10);
    metrics.observeRequest('POST /v1/meals', 200, 20);
    metrics.observeRequest('POST /v1/meals', 422, 1);

    expect(metrics.snapshot().requests_total).toEqual({
      'POST /v1/meals 200': 2,
      'POST /v1/meals 422': 1,
    });
  });

  it('counts the decision, which is the number the product is judged on', () => {
    metrics.observeOutcome('auto_accept');
    metrics.observeOutcome('review');
    metrics.observeOutcome('review');

    expect(metrics.snapshot().outcomes_total).toEqual({ auto_accept: 1, review: 2 });
  });

  it('summarises latency with percentiles rather than an average', () => {
    for (const value of [10, 20, 30, 40, 50]) {
      metrics.observeRequest('POST /v1/meals', 200, value);
    }

    expect(metrics.snapshot().request_latency).toMatchObject({
      count: 5,
      p50_ms: 30,
      max_ms: 50,
    });
  });

  it('reports nulls, not zeros, before any traffic', () => {
    expect(metrics.snapshot().request_latency).toEqual({
      count: 0,
      p50_ms: null,
      p95_ms: null,
      max_ms: null,
    });
  });

  it('bounds memory by keeping only the most recent samples', () => {
    for (let index = 0; index < 1200; index += 1) {
      metrics.observeRequest('POST /v1/meals', 200, index);
    }

    const latency = metrics.snapshot().request_latency;
    expect(latency.count).toBe(1000);
    // The window slid: the earliest samples are gone, so the floor has moved up.
    expect(latency.max_ms).toBe(1199);
  });

  it('keeps stage latencies separate so a regression can be attributed', () => {
    metrics.observeStage('vision', 100);
    metrics.observeStage('retrieval', 5);

    const stages = metrics.snapshot().stage_latency;
    expect(stages.vision.p50_ms).toBe(100);
    expect(stages.retrieval.p50_ms).toBe(5);
  });
});
