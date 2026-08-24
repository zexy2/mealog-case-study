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
exports.MealsService = exports.DEMO_USER_ID = exports.VISION_PORT = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("../config");
const obs_1 = require("../obs");
const runner_1 = require("../pipeline/runner");
const correction_1 = require("../pipeline/correction");
exports.VISION_PORT = Symbol('VISION_PORT');
exports.DEMO_USER_ID = 'demo-user';
function error(status, detail) {
    throw new common_1.HttpException({ detail }, status);
}
/** Edge provider that owns request-level idempotency, not pipeline state. */
let MealsService = class MealsService {
    vision;
    runtimeSettings;
    completed = new Map();
    inFlight = new Map();
    constructor(vision, runtimeSettings = config_1.settings) {
        this.vision = vision;
        this.runtimeSettings = runtimeSettings;
    }
    async logMeal(request, input, userId) {
        const config = runner_1.CONFIGS[request.config];
        if (!config) {
            error(common_1.HttpStatus.UNPROCESSABLE_ENTITY, `unknown config '${request.config}'; expected one of: ${Object.keys(runner_1.CONFIGS).sort().join(', ')}`);
        }
        const normalizedUserId = userId?.trim() || exports.DEMO_USER_ID;
        const cacheKey = `${normalizedUserId}\u0000${request.idempotency_key}`;
        const cached = this.completed.get(cacheKey);
        if (cached) {
            // Replays are logged. A duplicate that silently returns the first answer
            // looks like a fresh success in metrics unless it is named.
            (0, obs_1.event)('idempotent_replay', { config: request.config, source: 'completed' });
            return cached;
        }
        const pending = this.inFlight.get(cacheKey);
        if (pending) {
            (0, obs_1.event)('idempotent_replay', { config: request.config, source: 'in_flight' });
            return pending;
        }
        if (this.runtimeSettings.vision_provider !== 'fixture' && input.sampleId) {
            error(common_1.HttpStatus.BAD_REQUEST, 'sample_id is test-only; live provider needs image or text input');
        }
        const result = this.runOnce(cacheKey, request, input, config);
        this.inFlight.set(cacheKey, result);
        return result;
    }
    correctMeal(request) {
        try {
            return (0, correction_1.applyCorrections)(request);
        }
        catch (caught) {
            if (caught instanceof Error) {
                error(common_1.HttpStatus.UNPROCESSABLE_ENTITY, caught.message);
            }
            error(common_1.HttpStatus.UNPROCESSABLE_ENTITY, 'invalid correction request');
        }
    }
    async runOnce(cacheKey, request, input, config) {
        try {
            // The identity of what produced the answer travels with the timing:
            // provider, config, locale, and input mode. Without those, a latency or
            // accuracy change cannot be attributed to a cause.
            const result = await (0, obs_1.stageAsync)('pipeline', () => (0, runner_1.run)(this.vision, input, request.locale, config, request.idempotency_key), {
                config: request.config,
                provider: this.runtimeSettings.vision_provider,
                locale: request.locale,
                input_mode: this.inputModeOf(input),
            });
            this.completed.set(cacheKey, result);
            return result;
        }
        finally {
            this.inFlight.delete(cacheKey);
        }
    }
    /**
     * Which path produced the meal. Photo and text are different products with
     * different failure modes — issue #218 is a photo-path defect that the text
     * path does not have — so the mode has to be on the record.
     */
    inputModeOf(input) {
        if (input.imageBytes)
            return 'image';
        if (input.text)
            return 'text';
        return 'sample_id';
    }
};
exports.MealsService = MealsService;
exports.MealsService = MealsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(exports.VISION_PORT)),
    __param(1, (0, common_1.Inject)(config_1.Settings)),
    __metadata("design:paramtypes", [Object, config_1.Settings])
], MealsService);
//# sourceMappingURL=meals.service.js.map