"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const config_1 = require("../src/config");
(0, vitest_1.describe)('Settings', () => {
    (0, vitest_1.it)('matches Python defaults for an offline environment', () => {
        const value = new config_1.Settings({}).validated();
        (0, vitest_1.expect)(value.vision_provider).toBe('fixture');
        (0, vitest_1.expect)(value.gemini_api_key).toBeNull();
        (0, vitest_1.expect)(value.default_locale).toBe('en_US');
        (0, vitest_1.expect)(value.log_level).toBe('INFO');
        (0, vitest_1.expect)(value.commercial_mode).toBe(false);
    });
    (0, vitest_1.it)('accepts only the explicit truthy spellings', () => {
        (0, vitest_1.expect)(['1', 'true', 'YES', 'on'].map(config_1._truthy)).toEqual([true, true, true, true]);
        (0, vitest_1.expect)([undefined, '', '0', 'enabled'].map(config_1._truthy)).toEqual([false, false, false, false]);
    });
    (0, vitest_1.it)('fails validation when Gemini is selected without a key', () => {
        (0, vitest_1.expect)(() => new config_1.Settings({ VISION_PROVIDER: 'gemini' }).validated()).toThrow('VISION_PROVIDER=gemini requires GEMINI_API_KEY');
    });
    (0, vitest_1.it)('validates exported settings during module initialization', () => {
        (0, vitest_1.expect)(config_1.settings).toBeInstanceOf(config_1.Settings);
        (0, vitest_1.expect)(config_1.settings.validated()).toBe(config_1.settings);
    });
});
//# sourceMappingURL=config.test.js.map