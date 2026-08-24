import 'reflect-metadata';

import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app/app.module';
import { Settings } from '../src/config';
import { makePerceivedItem } from '../src/domain/models';
import { configureBodyParsers } from '../src/main';
import { VisionProviderError } from '../src/adapters/vision.gemini';
import { VISION_PORT } from '../src/app/meals.service';

describe('POST /v1/meals', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false });
    configureBodyParsers(app);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('accepts JSON fixture input and replays an idempotent result', async () => {
    const body = {
      idempotency_key: 'http-json-replay',
      sample_id: 'tr_0001',
      locale: 'tr',
      config: 'V3',
    };

    const first = await request(app.getHttpServer()).post('/v1/meals').send(body);
    const second = await request(app.getHttpServer()).post('/v1/meals').send(body);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
    expect(first.body).toMatchObject({
      idempotency_key: 'http-json-replay',
      config: 'V3',
      degraded: false,
    });
  });

  it('serializes provider degradation and keeps a high-confidence fallback in review', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(VISION_PORT)
      .useValue({
        name: 'degraded-stub',
        perceive: () => ({
          observations: [
            makePerceivedItem({
              surface_form: 'scrambled eggs',
              confidence: 1,
              portion_hint: 'one serving',
            }),
          ],
          degraded: true,
        }),
      })
      .compile();
    const degradedApp = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false });
    configureBodyParsers(degradedApp);
    await degradedApp.init();

    const response = await request(degradedApp.getHttpServer())
      .post('/v1/meals')
      .send({
        idempotency_key: 'http-degraded-fallback',
        locale: 'en_US',
        config: 'V3',
        text: 'scrambled eggs',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      degraded: true,
      action: 'review',
      items: [{ food_id: 'us.eggs_scrambled', confidence: 1 }],
    });
    await degradedApp.close();
  });

  it('maps an injected provider timeout to a typed 503 response', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(VISION_PORT)
      .useValue({
        name: 'timeout-stub',
        perceive: () => { throw new VisionProviderError('provider_timeout', 3); },
      })
      .compile();
    const timeoutApp = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false });
    configureBodyParsers(timeoutApp);
    await timeoutApp.init();

    const response = await request(timeoutApp.getHttpServer())
      .post('/v1/meals')
      .send({ idempotency_key: 'http-provider-timeout', locale: 'en_US', text: 'scrambled eggs' });

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      detail: 'vision provider timeout',
      category: 'provider_timeout',
      retry_attempted: true,
      attempts: 3,
    });
    await timeoutApp.close();
  });

  it('keeps a non-provider exception at the internal 500 boundary', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(VISION_PORT)
      .useValue({
        name: 'defect-stub',
        perceive: () => { throw new Error('internal defect'); },
      })
      .compile();
    const defectApp = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false });
    configureBodyParsers(defectApp);
    await defectApp.init();

    const response = await request(defectApp.getHttpServer())
      .post('/v1/meals')
      .send({ idempotency_key: 'http-internal-defect', locale: 'en_US', text: 'scrambled eggs' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ detail: 'Internal Server Error' });
    await defectApp.close();
  });

  it('accepts multipart form fields without an image for fixture replay', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/meals')
      .field('idempotency_key', 'http-multipart-fixture')
      .field('sample_id', 'tr_0002')
      .field('locale', 'tr')
      .field('config', 'V3');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ idempotency_key: 'http-multipart-fixture', locale: 'tr' });
  });

  it('scopes the same idempotency key by X-User-Id', async () => {
    const first = await request(app.getHttpServer())
      .post('/v1/meals')
      .set('X-User-Id', 'user-a')
      .send({ idempotency_key: 'http-shared-key', sample_id: 'tr_0001', locale: 'tr' });
    const second = await request(app.getHttpServer())
      .post('/v1/meals')
      .set('X-User-Id', 'user-b')
      .send({ idempotency_key: 'http-shared-key', sample_id: 'tr_0002', locale: 'tr' });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body).not.toEqual(second.body);
  });

  it('validates the V0-V3 config set and rejects unknown configs with 422', async () => {
    for (const config of ['V0', 'V1', 'V2', 'V3']) {
      const response = await request(app.getHttpServer())
        .post('/v1/meals')
        .send({ idempotency_key: `http-config-${config}`, sample_id: 'tr_0001', locale: 'tr', config });
      expect(response.status).toBe(200);
    }

    const unknown = await request(app.getHttpServer())
      .post('/v1/meals')
      .send({ idempotency_key: 'http-config-unknown', sample_id: 'tr_0001', config: 'V9' });
    expect(unknown.status).toBe(422);
    expect(unknown.body).toEqual({
      detail: "unknown config 'V9'; expected one of: V0, V1, V2, V3",
    });
  });

  it('rejects unsupported image MIME types with the Python-compatible 415', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/meals')
      .field('idempotency_key', 'http-bad-mime')
      .attach('image', Buffer.from('not an image'), { filename: 'meal.txt', contentType: 'text/plain' });

    expect(response.status).toBe(415);
    expect(response.body).toEqual({ detail: 'unsupported image content type' });
  });

  it('rejects MIME-spoofed image bytes before provider handling', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/meals')
      .field('idempotency_key', 'http-spoofed-image')
      .attach('image', Buffer.from('not a JPEG'), { filename: 'meal.jpg', contentType: 'image/jpeg' });

    expect(response.status).toBe(415);
    expect(response.body).toEqual({ detail: 'unsupported image content' });
  });

  it('rejects an image over 10 MiB with the Python-compatible 413', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/meals')
      .field('idempotency_key', 'http-large-image')
      .attach('image', Buffer.alloc(10 * 1024 * 1024 + 1), {
        filename: 'meal.jpg',
        contentType: 'image/jpeg',
      });

    expect(response.status).toBe(413);
    expect(response.body).toEqual({ detail: 'image exceeds 10 MiB limit' });
  });

  it('returns 422 for a JSON request without an input source', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/meals')
      .send({ idempotency_key: 'http-no-input' });

    expect(response.status).toBe(422);
    expect(response.body).toEqual({ detail: 'request needs image, text, or sample_id' });
  });

  it('rejects sample_id when the configured provider is live', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(Settings)
      .useValue(new Settings({ VISION_PROVIDER: 'gemini', GEMINI_API_KEY: 'test-key' }))
      .overrideProvider(VISION_PORT)
      .useValue({ name: 'stub', perceive: () => { throw new Error('vision should not run'); } })
      .compile();
    const liveApp = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false });
    configureBodyParsers(liveApp);
    await liveApp.init();

    const response = await request(liveApp.getHttpServer())
      .post('/v1/meals')
      .send({ idempotency_key: 'http-live-sample', sample_id: 'tr_0001' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      detail: 'sample_id is test-only; live provider needs image or text input',
    });
    await liveApp.close();
  });

  it('maps malformed JSON to the Python-compatible 422', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/meals')
      .set('content-type', 'application/json')
      .send('{"idempotency_key":');

    expect(response.status).toBe(422);
    expect(response.body).toEqual({ detail: 'invalid JSON request' });
  });

  it('keeps the existing 413 and 422 boundaries after provider-error mapping', async () => {
    const tooLarge = await request(app.getHttpServer())
      .post('/v1/meals')
      .field('idempotency_key', 'http-provider-error-large-image')
      .attach('image', Buffer.alloc(10 * 1024 * 1024 + 1), {
        filename: 'meal.jpg',
        contentType: 'image/jpeg',
      });
    const malformed = await request(app.getHttpServer())
      .post('/v1/meals')
      .set('content-type', 'application/json')
      .send('{"idempotency_key":');

    expect(tooLarge.status).toBe(413);
    expect(tooLarge.body).toEqual({ detail: 'image exceeds 10 MiB limit' });
    expect(malformed.status).toBe(422);
    expect(malformed.body).toEqual({ detail: 'invalid JSON request' });
  });

  it('returns typed 422 for text-only inputs in fixture mode instead of unhandled 500', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/meals')
      .send({
        idempotency_key: 'http-text-only-fixture-test',
        text: 'kuru fasulye',
        locale: 'tr',
        config: 'V3',
      });

    expect(response.status).toBe(422);
    const body = response.body as { detail?: string };
    expect(body.detail).toMatch(/fixture replay needs image bytes or a sample_id/);
  });

  it('GDPR delete purges user meal cache and resets user rate limiter', async () => {
    const userId = 'gdpr-e2e-user';
    const key = 'gdpr-purge-key';

    // 1. Initial meal
    const res1 = await request(app.getHttpServer())
      .post('/v1/meals')
      .set('x-user-id', userId)
      .send({
        idempotency_key: key,
        sample_id: 'tr_0001',
        locale: 'tr',
        config: 'V3',
      });
    expect(res1.status).toBe(200);
    const body1 = res1.body as { items: Array<{ food_id: string }> };
    expect(body1.items[0]?.food_id).toBe('tr.kuru_fasulye');

    // 2. Delete user data without auth header -> 403 Forbidden
    const unauthDel = await request(app.getHttpServer()).delete(`/v1/users/${userId}/data`);
    expect(unauthDel.status).toBe(403);

    // 3. Delete user data with matching X-User-Id header -> 204 No Content
    const delRes = await request(app.getHttpServer())
      .delete(`/v1/users/${userId}/data`)
      .set('x-user-id', userId);
    expect(delRes.status).toBe(204);

    // 4. Subsequent meal with same key but different payload returns the new calculation
    const res2 = await request(app.getHttpServer())
      .post('/v1/meals')
      .set('x-user-id', userId)
      .send({
        idempotency_key: key,
        sample_id: 'tr_0002',
        locale: 'tr',
        config: 'V3',
      });
    expect(res2.status).toBe(200);
    const body2 = res2.body as { items: Array<{ food_id: string }> };
    expect(body2.items[0]?.food_id).toBe('tr.simit');
  });

  it('rejects an empty idempotency key with 422', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/meals')
      .send({
        idempotency_key: '   ',
        sample_id: 'tr_0001',
        locale: 'tr',
        config: 'V3',
      });

    expect(response.status).toBe(422);
    const body = response.body as { detail?: string };
    expect(body.detail).toBe('invalid JSON request');
  });

  it('returns 409 Conflict when the same idempotency key is reused with a different payload', async () => {
    const key = 'conflict-test-key';
    const userId = 'conflict-user';

    const res1 = await request(app.getHttpServer())
      .post('/v1/meals')
      .set('x-user-id', userId)
      .send({
        idempotency_key: key,
        sample_id: 'tr_0001',
        locale: 'tr',
        config: 'V3',
      });
    expect(res1.status).toBe(200);

    // Second request with same key but different sample_id -> 409 Conflict
    const res2 = await request(app.getHttpServer())
      .post('/v1/meals')
      .set('x-user-id', userId)
      .send({
        idempotency_key: key,
        sample_id: 'tr_0002',
        locale: 'tr',
        config: 'V3',
      });
    expect(res2.status).toBe(409);
    const body2 = res2.body as { detail?: string };
    expect(body2.detail).toBe('idempotency key reused with different request payload');
  });

  it('rejects path-traversal or malformed sample_id with 422', async () => {
    const maliciousSampleIds = ['../../package', '../reports/scorecard', '/etc/hosts', 'tr_0001; rm -rf'];

    for (const sampleId of maliciousSampleIds) {
      const response = await request(app.getHttpServer())
        .post('/v1/meals')
        .send({
          idempotency_key: `traversal-${Math.random()}`,
          sample_id: sampleId,
          locale: 'tr',
          config: 'V3',
        });

      expect(response.status).toBe(422);
      const body = response.body as { detail?: string };
      expect(body.detail).toMatch(/invalid sample_id/);
    }
  });
});
