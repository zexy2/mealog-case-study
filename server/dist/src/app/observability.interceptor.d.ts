import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
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
export declare class ObservabilityInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown>;
    private statusOf;
    private record;
    /** Read the gate decision out of a meal response without assuming a shape. */
    private actionOf;
}
