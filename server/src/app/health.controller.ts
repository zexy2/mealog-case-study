import { Controller, Get, Inject } from '@nestjs/common';

import { Settings } from '../config';

export interface HealthResponse {
  status: 'ok';
  vision: string;
}

/**
 * Liveness endpoint.
 *
 * The edge is the only layer allowed to import NestJS. This controller does no
 * work beyond answering that the process is up: it must not reach into the
 * pipeline, because Wave 0 deliberately ports no pipeline logic.
 */
@Controller('health')
export class HealthController {
  constructor(@Inject(Settings) private readonly settings: Settings) {}

  @Get()
  check(): HealthResponse {
    return { status: 'ok', vision: this.settings.vision_provider };
  }
}
