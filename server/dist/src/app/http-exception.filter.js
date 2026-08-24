"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const vision_gemini_1 = require("../adapters/vision.gemini");
function responseText(payload) {
    if (typeof payload === 'string')
        return payload;
    try {
        return JSON.stringify(payload) ?? '';
    }
    catch {
        return '';
    }
}
/** Keep parser and Multer failures on the Python API's wire contract. */
let HttpExceptionFilter = class HttpExceptionFilter {
    catch(exception, host) {
        const context = host.switchToHttp();
        const response = context.getResponse();
        const request = context.getRequest();
        if (exception instanceof vision_gemini_1.VisionProviderError) {
            response.status(503).json({
                detail: exception.detail,
                category: exception.category,
                retry_attempted: exception.attempts > 1,
                attempts: exception.attempts,
            });
            return;
        }
        if (exception instanceof common_1.HttpException) {
            const status = exception.getStatus();
            const payload = exception.getResponse();
            const text = responseText(payload);
            // FileInterceptor translates Multer's LIMIT_FILE_SIZE into a 400. The
            // Python boundary treats an image over the limit as a payload error.
            if ((status === 400 || status === 413) && /file too large|limit_file_size/i.test(text)) {
                response.status(413).json({ detail: 'image exceeds 10 MiB limit' });
                return;
            }
            // Express's JSON parser reports malformed JSON as a 400 before the
            // controller runs; FastAPI exposes that boundary as a 422.
            const contentType = request.headers['content-type'];
            if (status === 400
                && typeof contentType === 'string'
                && contentType.toLowerCase().startsWith('application/json')
                && /unexpected|json parse|invalid json/i.test(text)) {
                response.status(422).json({ detail: 'invalid JSON request' });
                return;
            }
            if (typeof payload === 'object' && payload !== null) {
                response.status(status).json(payload);
            }
            else {
                response.status(status).json({ detail: String(payload) });
            }
            return;
        }
        const code = exception?.code;
        if (code === 'LIMIT_FILE_SIZE') {
            response.status(413).json({ detail: 'image exceeds 10 MiB limit' });
            return;
        }
        response.status(500).json({ detail: 'Internal Server Error' });
    }
};
exports.HttpExceptionFilter = HttpExceptionFilter;
exports.HttpExceptionFilter = HttpExceptionFilter = __decorate([
    (0, common_1.Catch)()
], HttpExceptionFilter);
//# sourceMappingURL=http-exception.filter.js.map