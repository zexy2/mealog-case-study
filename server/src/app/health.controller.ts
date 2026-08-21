import { Controller, Get } from '@nestjs/common';

export interface HealthResponse {
  status: 'ok';
  service: string;
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
  @Get()
  check(): HealthResponse {
    return { status: 'ok', service: 'mealog' };
  }
}
