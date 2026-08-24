import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { event, metrics, newRequestId, withRequestId } from '../obs';
import { VisionProviderError } from '../adapters/vision.gemini';


/**
 * Only the surface this interceptor touches, declared structurally.
 *
 * Typing against `express` directly would add `@types/express` for four
 * properties and pull the HTTP driver into a file that only needs a method, a
 * path, and a header. Structural types keep the dependency list honest and
 * would still compile against Fastify.
 */
interface IncomingRequest {
  readonly method: string;
  readonly path: string;
  readonly route?: { readonly path?: string };
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
}

interface OutgoingResponse {
  readonly statusCode: number;
  setHeader(name: string, value: string): unknown;
}

function headerValue(request: IncomingRequest, name: string): string | undefined {
  const raw = request.headers[name];
  return Array.isArray(raw) ? raw[0] : raw;
}

/**
 * The one place the edge is wired to observability.
 *
 * Responsibilities, in order: give every request an id, put that id where the
 * caller can quote it back (`X-Request-Id`), time the request, and record the
 * pipeline outcome. Keeping this in an interceptor is what lets `obs.ts` stay
 * framework-free — the pipeline logs through plain functions and never learns
 * that Nest exists.
 *
 * An inbound `X-Request-Id` is honoured so a mobile client's id survives into
 * server logs. It is echoed, not trusted: it is used for correlation only and
 * never for authorization or idempotency.
 */
@Injectable()
export class ObservabilityInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<IncomingRequest>();
    const response = http.getResponse<OutgoingResponse>();

    const inbound = headerValue(request, 'x-request-id');
    const requestId = inbound && inbound.length <= 64 ? inbound : newRequestId();
    response.setHeader('X-Request-Id', requestId);

    const route = `${request.method} ${request.route?.path ?? request.path}`;
    const started = performance.now();

    // `withRequestId` covers the handler, but a `tap` callback fires when the
    // value is emitted — after this scope has already exited — so the id has to
    // be re-entered there. Without this the summary line logs `request_id: "-"`
    // and cannot be joined to the stage lines it summarises.
    return withRequestId(requestId, () =>
      next.handle().pipe(
        tap({
          next: (body: unknown) => {
            withRequestId(requestId, () => {
              this.record(route, response.statusCode, started, body);
            });
          },
          error: (error: unknown) => {
            // The exception filter decides the final status. At this point the
            // response status is not yet the one the client will see, so the
            // status is read off the error and the filter's own response is
            // what the client reads.
            const status = this.statusOf(error);
            withRequestId(requestId, () => {
              this.record(route, status, started, undefined);
              event('request_failed', { route, status });
            });
          },
        }),
      ),
    );
  }

  private statusOf(error: unknown): number {
    if (error instanceof VisionProviderError) {
      return 503;
    }
    if (error instanceof HttpException) {
      return error.getStatus();
    }
    const status =
      (error as { status?: unknown; statusCode?: unknown } | null)?.status ??
      (error as { statusCode?: unknown } | null)?.statusCode;
    return typeof status === 'number' ? status : 500;
  }


  private record(route: string, status: number, started: number, body: unknown): void {
    const durationMs = Number((performance.now() - started).toFixed(2));
    metrics.observeRequest(route, status, durationMs);

    const action = this.actionOf(body);
    if (action) metrics.observeOutcome(action);

    event('request', {
      route,
      status,
      duration_ms: durationMs,
      // The decision, not the nutrition: commit/ask/abstain is the number that
      // tells you whether the gate is behaving on live traffic.
      ...(action ? { action } : {}),
    });
  }

  /** Read the gate decision out of a meal response without assuming a shape. */
  private actionOf(body: unknown): string | null {
    if (typeof body !== 'object' || body === null) return null;
    const action = (body as { action?: unknown }).action;
    return typeof action === 'string' ? action : null;
  }
}
