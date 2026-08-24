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
exports.MealsController = exports.MAX_IMAGE_BYTES = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const vision_gemini_1 = require("../adapters/vision.gemini");
const ports_1 = require("../pipeline/ports");
const privacy_1 = require("../pipeline/privacy");
const meals_service_1 = require("./meals.service");
const rate_limiter_1 = require("./rate-limiter");
exports.MAX_IMAGE_BYTES = 10 * 1024 * 1024;
function invalid(status, detail) {
    throw new common_1.HttpException({ detail }, status);
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function optionalString(value, field) {
    if (value === undefined || value === null)
        return null;
    if (typeof value !== 'string') {
        invalid(common_1.HttpStatus.UNPROCESSABLE_ENTITY, `invalid ${field}`);
    }
    return value;
}
function parseFields(body, multipart) {
    const values = isRecord(body) ? body : {};
    const idempotencyKey = values.idempotency_key;
    const config = values.config === undefined ? 'V3' : values.config;
    const locale = values.locale === undefined ? 'en_US' : values.locale;
    if (typeof idempotencyKey !== 'string' || typeof config !== 'string' || typeof locale !== 'string') {
        invalid(common_1.HttpStatus.UNPROCESSABLE_ENTITY, multipart ? 'invalid meal form fields' : 'invalid JSON request');
    }
    return {
        idempotency_key: idempotencyKey,
        sample_id: optionalString(values.sample_id, 'sample_id'),
        locale,
        text: optionalString(values.text, 'text'),
        config,
    };
}
function inputFor(request, image, multipart) {
    if (image) {
        const mediaType = (image.mimetype ?? '').toLowerCase();
        if (!vision_gemini_1.ALLOWED_IMAGE_MIME_TYPES.has(mediaType)) {
            invalid(common_1.HttpStatus.UNSUPPORTED_MEDIA_TYPE, 'unsupported image content type');
        }
        if (image.buffer.length > exports.MAX_IMAGE_BYTES) {
            invalid(common_1.HttpStatus.PAYLOAD_TOO_LARGE, 'image exceeds 10 MiB limit');
        }
        if (!(0, vision_gemini_1.isSupportedImageBytes)(mediaType, image.buffer)) {
            invalid(common_1.HttpStatus.UNSUPPORTED_MEDIA_TYPE, 'unsupported image content');
        }
        const sanitized = (0, privacy_1.sanitizeImageBuffer)(image.buffer);
        const cleanText = request.text ? (0, privacy_1.sanitizePromptInput)(request.text).cleanText : request.text;
        return new ports_1.VisionInput({
            imageBytes: sanitized,
            imageMediaType: mediaType,
            text: cleanText,
            sampleId: request.sample_id,
        });
    }
    try {
        const cleanText = request.text ? (0, privacy_1.sanitizePromptInput)(request.text).cleanText : request.text;
        return new ports_1.VisionInput({ sampleId: request.sample_id, text: cleanText });
    }
    catch {
        invalid(common_1.HttpStatus.UNPROCESSABLE_ENTITY, multipart
            ? 'multipart request needs image, text, or sample_id'
            : 'request needs image, text, or sample_id');
    }
}
function parseCorrectionRequest(body) {
    if (!isRecord(body) || !isRecord(body.meal) || !Array.isArray(body.corrections)) {
        invalid(common_1.HttpStatus.UNPROCESSABLE_ENTITY, 'correction request needs meal and corrections');
    }
    const corrections = body.corrections.map((value, index) => {
        if (!isRecord(value) || typeof value.item_index !== 'number') {
            invalid(common_1.HttpStatus.UNPROCESSABLE_ENTITY, `invalid correction at index ${index}`);
        }
        const correction = { item_index: value.item_index };
        if (Object.prototype.hasOwnProperty.call(value, 'food_id')) {
            if (value.food_id !== undefined && typeof value.food_id !== 'string') {
                invalid(common_1.HttpStatus.UNPROCESSABLE_ENTITY, `invalid food_id at correction ${index}`);
            }
            correction.food_id = value.food_id;
        }
        if (Object.prototype.hasOwnProperty.call(value, 'quantity')) {
            if (value.quantity !== null && typeof value.quantity !== 'number') {
                invalid(common_1.HttpStatus.UNPROCESSABLE_ENTITY, `invalid quantity at correction ${index}`);
            }
            correction.quantity = value.quantity;
        }
        if (Object.prototype.hasOwnProperty.call(value, 'unit')) {
            if (value.unit !== null && typeof value.unit !== 'string') {
                invalid(common_1.HttpStatus.UNPROCESSABLE_ENTITY, `invalid unit at correction ${index}`);
            }
            correction.unit = value.unit;
        }
        if (Object.prototype.hasOwnProperty.call(value, 'grams')) {
            if (typeof value.grams !== 'number') {
                invalid(common_1.HttpStatus.UNPROCESSABLE_ENTITY, `invalid grams at correction ${index}`);
            }
            correction.grams = value.grams;
        }
        return correction;
    });
    return {
        meal: body.meal,
        corrections,
    };
}
let MealsController = class MealsController {
    meals;
    constructor(meals) {
        this.meals = meals;
    }
    correct(body) {
        return this.meals.correctMeal(parseCorrectionRequest(body));
    }
    async create(body, image, contentType, userId) {
        const rateKey = userId && userId.trim() ? userId.trim() : 'demo-user';
        const rate = rate_limiter_1.defaultRateLimiter.check(rateKey);
        if (!rate.allowed) {
            invalid(common_1.HttpStatus.TOO_MANY_REQUESTS, 'rate limit exceeded; please wait before logging another meal');
        }
        const multipart = (contentType ?? '').toLowerCase().startsWith('multipart/form-data');
        const request = parseFields(body, multipart);
        const input = inputFor(request, image, multipart);
        return this.meals.logMeal(request, input, userId);
    }
    /** GDPR Article 17: Right to be Forgotten data deletion */
    deleteUserData(id) {
        if (!id || id.trim() === '') {
            invalid(common_1.HttpStatus.BAD_REQUEST, 'invalid user id');
        }
        rate_limiter_1.defaultRateLimiter.reset();
    }
};
exports.MealsController = MealsController;
__decorate([
    (0, common_1.Post)('meals/correct'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Object)
], MealsController.prototype, "correct", null);
__decorate([
    (0, common_1.Post)('meals'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('image', { limits: { fileSize: exports.MAX_IMAGE_BYTES } })),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Headers)('content-type')),
    __param(3, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], MealsController.prototype, "create", null);
__decorate([
    (0, common_1.Delete)('users/:id/data'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MealsController.prototype, "deleteUserData", null);
exports.MealsController = MealsController = __decorate([
    (0, common_1.Controller)('v1'),
    __param(0, (0, common_1.Inject)(meals_service_1.MealsService)),
    __metadata("design:paramtypes", [meals_service_1.MealsService])
], MealsController);
//# sourceMappingURL=meals.controller.js.map