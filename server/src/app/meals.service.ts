import { Inject, Injectable, HttpException, HttpStatus } from '@nestjs/common';

import { settings, Settings } from '../config';
import { CONFIGS, run, type Config } from '../pipeline/runner';
import { VisionInput, type VisionPort } from '../pipeline/ports';
import type { MealLog } from '../domain/models';
import { applyCorrections, type CorrectionRequest } from '../pipeline/correction';

export const VISION_PORT = Symbol('VISION_PORT');
export const DEMO_USER_ID = 'demo-user';

export interface MealRequest {
  readonly idempotency_key: string;
  readonly sample_id: string | null;
  readonly locale: string;
  readonly text: string | null;
  readonly config: string;
}

function error(status: HttpStatus, detail: string): never {
  throw new HttpException({ detail }, status);
}

/** Edge provider that owns request-level idempotency, not pipeline state. */
@Injectable()
export class MealsService {
  private readonly completed = new Map<string, MealLog>();
  private readonly inFlight = new Map<string, Promise<MealLog>>();

  constructor(
    @Inject(VISION_PORT) private readonly vision: VisionPort,
    @Inject(Settings) private readonly runtimeSettings: Settings = settings,
  ) {}

  async logMeal(
    request: MealRequest,
    input: VisionInput,
    userId: string | undefined,
  ): Promise<MealLog> {
    const config = CONFIGS[request.config];
    if (!config) {
      error(
        HttpStatus.UNPROCESSABLE_ENTITY,
        `unknown config '${request.config}'; expected one of: ${Object.keys(CONFIGS).sort().join(', ')}`,
      );
    }

    const normalizedUserId = userId?.trim() || DEMO_USER_ID;
    const cacheKey = `${normalizedUserId}\u0000${request.idempotency_key}`;
    const cached = this.completed.get(cacheKey);
    if (cached) return cached;

    const pending = this.inFlight.get(cacheKey);
    if (pending) return pending;

    if (this.runtimeSettings.vision_provider !== 'fixture' && input.sampleId) {
      error(
        HttpStatus.BAD_REQUEST,
        'sample_id is test-only; live provider needs image or text input',
      );
    }

    const result = this.runOnce(cacheKey, request, input, config);
    this.inFlight.set(cacheKey, result);
    return result;
  }

  correctMeal(request: CorrectionRequest): MealLog {
    try {
      return applyCorrections(request);
    } catch (caught) {
      if (caught instanceof Error) {
        error(HttpStatus.UNPROCESSABLE_ENTITY, caught.message);
      }
      error(HttpStatus.UNPROCESSABLE_ENTITY, 'invalid correction request');
    }
  }

  private async runOnce(
    cacheKey: string,
    request: MealRequest,
    input: VisionInput,
    config: Config,
  ): Promise<MealLog> {
    try {
      const result = await run(
        this.vision,
        input,
        request.locale,
        config,
        request.idempotency_key,
      );
      this.completed.set(cacheKey, result);
      return result;
    } finally {
      this.inFlight.delete(cacheKey);
    }
  }
}
