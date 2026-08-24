"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObservabilityInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const obs_1 = require("../obs");
function headerValue(request, name) {
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
let ObservabilityInterceptor = class ObservabilityInterceptor {
    intercept(context, next) {
        const http = context.switchToHttp();
        const request = http.getRequest();
        const response = http.getResponse();
        const inbound = headerValue(request, 'x-request-id');
        const requestId = inbound && inbound.length <= 64 ? inbound : (0, obs_1.newRequestId)();
        response.setHeader('X-Request-Id', requestId);
        const route = `${request.method} ${request.route?.path ?? request.path}`;
        const started = performance.now();
        // `withRequestId` covers the handler, but a `tap` callback fires when the
        // value is emitted — after this scope has already exited — so the id has to
        // be re-entered there. Without this the summary line logs `request_id: "-"`
        // and cannot be joined to the stage lines it summarises.
        return (0, obs_1.withRequestId)(requestId, () => next.handle().pipe((0, operators_1.tap)({
            next: (body) => {
                (0, obs_1.withRequestId)(requestId, () => {
                    this.record(route, response.statusCode, started, body);
                });
            },
            error: (error) => {
                // The exception filter decides the final status. At this point the
                // response status is not yet the one the client will see, so the
                // status is read off the error and the filter's own response is
                // what the client reads.
                const status = this.statusOf(error);
                (0, obs_1.withRequestId)(requestId, () => {
                    this.record(route, status, started, undefined);
                    (0, obs_1.event)('request_failed', { route, status });
                });
            },
        })));
    }
    statusOf(error) {
        const status = error?.status;
        return typeof status === 'number' ? status : 500;
    }
    record(route, status, started, body) {
        const durationMs = Number((performance.now() - started).toFixed(2));
        obs_1.metrics.observeRequest(route, status, durationMs);
        const action = this.actionOf(body);
        if (action)
            obs_1.metrics.observeOutcome(action);
        (0, obs_1.event)('request', {
            route,
            status,
            duration_ms: durationMs,
            // The decision, not the nutrition: commit/ask/abstain is the number that
            // tells you whether the gate is behaving on live traffic.
            ...(action ? { action } : {}),
        });
    }
    /** Read the gate decision out of a meal response without assuming a shape. */
    actionOf(body) {
        if (typeof body !== 'object' || body === null)
            return null;
        const action = body.action;
        return typeof action === 'string' ? action : null;
    }
};
exports.ObservabilityInterceptor = ObservabilityInterceptor;
exports.ObservabilityInterceptor = ObservabilityInterceptor = __decorate([
    (0, common_1.Injectable)()
], ObservabilityInterceptor);
//# sourceMappingURL=observability.interceptor.js.map