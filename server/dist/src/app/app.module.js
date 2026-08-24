"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const vision_fixture_1 = require("../adapters/vision.fixture");
const vision_gemini_1 = require("../adapters/vision.gemini");
const config_1 = require("../config");
const obs_1 = require("../obs");
const health_controller_1 = require("./health.controller");
const http_exception_filter_1 = require("./http-exception.filter");
const meals_controller_1 = require("./meals.controller");
const meals_service_1 = require("./meals.service");
const observability_interceptor_1 = require("./observability.interceptor");
function makeVision(runtimeSettings) {
    if (runtimeSettings.vision_provider === 'fixture') {
        return new vision_fixture_1.FixtureVision();
    }
    if (runtimeSettings.vision_provider === 'gemini') {
        return new vision_gemini_1.GeminiVision({ apiKey: runtimeSettings.gemini_api_key ?? '' });
    }
    throw new Error(`unknown vision provider: ${runtimeSettings.vision_provider}`);
}
// LOG_LEVEL is read once, here, so the level is fixed before the first request
// rather than re-derived per log line.
(0, obs_1.configure)(config_1.settings.log_level);
/**
 * Composition root for the edge.
 *
 * Under the port epic's proposed D12, NestJS lives at the edge only:
 * controllers and providers. Pipeline modules are wired in as plain functions
 * and pure classes in later waves, so that the eval harness can import the same
 * modules without booting Nest.
 */
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        controllers: [health_controller_1.HealthController, health_controller_1.MetricsController, meals_controller_1.MealsController],
        providers: [
            { provide: config_1.Settings, useValue: config_1.settings },
            // Observability is global at the edge, not sprinkled per controller: a
            // request that is not logged is a request that cannot be explained.
            { provide: core_1.APP_INTERCEPTOR, useClass: observability_interceptor_1.ObservabilityInterceptor },
            {
                provide: meals_service_1.VISION_PORT,
                useFactory: (runtimeSettings) => makeVision(runtimeSettings),
                inject: [config_1.Settings],
            },
            meals_service_1.MealsService,
            { provide: core_1.APP_FILTER, useClass: http_exception_filter_1.HttpExceptionFilter },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map