import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { FixtureVision } from '../adapters/vision.fixture';
import { GeminiVision } from '../adapters/vision.gemini';
import { settings, Settings } from '../config';
import type { VisionPort } from '../pipeline/ports';

import { HealthController } from './health.controller';
import { HttpExceptionFilter } from './http-exception.filter';
import { MealsController } from './meals.controller';
import { MealsService, VISION_PORT } from './meals.service';

function makeVision(runtimeSettings: Settings): VisionPort {
  if (runtimeSettings.vision_provider === 'fixture') {
    return new FixtureVision();
  }
  if (runtimeSettings.vision_provider === 'gemini') {
    return new GeminiVision({ apiKey: runtimeSettings.gemini_api_key ?? '' });
  }
  throw new Error(`unknown vision provider: ${runtimeSettings.vision_provider}`);
}

/**
 * Composition root for the edge.
 *
 * Under the port epic's proposed D12, NestJS lives at the edge only:
 * controllers and providers. Pipeline modules are wired in as plain functions
 * and pure classes in later waves, so that the eval harness can import the same
 * modules without booting Nest.
 */
@Module({
  controllers: [HealthController, MealsController],
  providers: [
    { provide: Settings, useValue: settings },
    {
      provide: VISION_PORT,
      useFactory: (runtimeSettings: Settings) => makeVision(runtimeSettings),
      inject: [Settings],
    },
    MealsService,
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
