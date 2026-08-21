import 'reflect-metadata';

import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app/app.module';
import { Settings } from '../src/config';
import { configureBodyParsers } from '../src/main';
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
    expect(first.body).toMatchObject({ idempotency_key: 'http-json-replay', config: 'V3' });
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
});
