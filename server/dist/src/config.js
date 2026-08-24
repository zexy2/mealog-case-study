"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settings = exports.Settings = void 0;
exports._truthy = _truthy;
/** Parse the explicit truthy values used by the Python configuration. */
function _truthy(value) {
    return new Set(['1', 'true', 'yes', 'on']).has((value ?? '').trim().toLowerCase());
}
/** Runtime settings shared by the edge and framework-free pipeline. */
class Settings {
    vision_provider;
    geminiApiKey;
    default_locale;
    log_level;
    commercial_mode;
    constructor(env = process.env) {
        this.vision_provider = env.VISION_PROVIDER ?? 'fixture';
        this.geminiApiKey = env.GEMINI_API_KEY || null;
        this.default_locale = env.DEFAULT_LOCALE ?? 'en_US';
        this.log_level = env.LOG_LEVEL ?? 'INFO';
        this.commercial_mode = _truthy(env.MEALOG_COMMERCIAL_MODE);
    }
    get gemini_api_key() {
        return this.geminiApiKey;
    }
    /** Validate configuration before the application can serve a request. */
    validated() {
        if (this.vision_provider === 'gemini' && !this.gemini_api_key) {
            throw new Error('VISION_PROVIDER=gemini requires GEMINI_API_KEY. '
                + 'Use VISION_PROVIDER=fixture to run fully offline.');
        }
        return this;
    }
}
exports.Settings = Settings;
/** Importing application configuration fails fast on an invalid environment. */
exports.settings = new Settings().validated();
//# sourceMappingURL=config.js.map