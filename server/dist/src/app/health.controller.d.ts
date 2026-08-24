import { Settings } from '../config';
import { type MetricsSnapshot } from '../obs';
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
export declare class HealthController {
    private readonly settings;
    constructor(settings: Settings);
    check(): HealthResponse;
}
/**
 * Metrics scrape endpoint.
 *
 * JSON rather than Prometheus text: nothing in this case study scrapes it, and
 * a shape a reviewer can read with `curl | jq` is worth more here than a wire
 * format for a collector that is not deployed.
 *
 * Security note: this route is unauthenticated, like the rest of the service
 * (see README "Security and privacy limits"). It exposes counts and latencies
 * only — no meal contents, no user ids, no image bytes — so the exposure is
 * traffic-shape metadata. Before any real deployment it needs to sit behind
 * authentication or bind to an internal interface.
 */
export declare class MetricsController {
    snapshot(): MetricsSnapshot;
}
