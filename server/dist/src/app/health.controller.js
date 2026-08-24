"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsController = exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("../config");
const obs_1 = require("../obs");
/**
 * Liveness endpoint.
 *
 * The edge is the only layer allowed to import NestJS. This controller does no
 * work beyond answering that the process is up: it must not reach into the
 * pipeline, because Wave 0 deliberately ports no pipeline logic.
 */
let HealthController = class HealthController {
    settings;
    constructor(settings) {
        this.settings = settings;
    }
    check() {
        return { status: 'ok', vision: this.settings.vision_provider };
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], HealthController.prototype, "check", null);
exports.HealthController = HealthController = __decorate([
    (0, common_1.Controller)('health'),
    __param(0, (0, common_1.Inject)(config_1.Settings)),
    __metadata("design:paramtypes", [config_1.Settings])
], HealthController);
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
let MetricsController = class MetricsController {
    snapshot() {
        return obs_1.metrics.snapshot();
    }
};
exports.MetricsController = MetricsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], MetricsController.prototype, "snapshot", null);
exports.MetricsController = MetricsController = __decorate([
    (0, common_1.Controller)('metrics')
], MetricsController);
//# sourceMappingURL=health.controller.js.map