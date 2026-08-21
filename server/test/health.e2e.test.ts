/**
 * Boots the real Nest application and drives it over HTTP.
 *
 * This is the check that the edge actually starts: a unit test on the
 * controller class would pass even if the module graph were broken, which is
 * the failure that would block every later wave.
 */

import 'reflect-metadata';

import type { Server } from 'node:http';

import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app/app.module';

describe('GET /health', () => {
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('returns 200', async () => {
    const response = await request(server).get('/health');
    expect(response.status).toBe(200);
  });

  it('reports the service as up', async () => {
    const response = await request(server).get('/health');
    expect(response.body).toEqual({ status: 'ok', vision: 'fixture' });
  });

  it('404s an unknown route, proving routing is real and not a catch-all', async () => {
    const response = await request(server).get('/health/nope');
    expect(response.status).toBe(404);
  });
});
