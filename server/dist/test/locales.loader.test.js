"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const vitest_1 = require("vitest");
const loader_1 = require("../src/locales/loader");
const PACK_ROOT = (0, node_path_1.resolve)(__dirname, '../../locale_packs');
(0, vitest_1.describe)('locale loader', () => {
    (0, vitest_1.it)('loads every pack and keeps aliases inside the catalogue', () => {
        (0, vitest_1.expect)((0, loader_1.available)(PACK_ROOT)).toEqual(['en_US', 'ja_JP', 'tr']);
        for (const locale of (0, loader_1.available)(PACK_ROOT)) {
            const pack = (0, loader_1.load)(locale, PACK_ROOT);
            (0, vitest_1.expect)(Object.keys(pack.foods).length).toBeGreaterThan(0);
            (0, vitest_1.expect)(pack.license).toBeTruthy();
            for (const foodId of Object.keys(pack.aliases)) {
                (0, vitest_1.expect)(pack.foods).toHaveProperty(foodId);
            }
        }
    });
    (0, vitest_1.it)('maps licence vocabulary and fails closed for unknown values', () => {
        (0, vitest_1.expect)((0, loader_1.parse_license)('public-domain')).toBe(loader_1.LicenseTerm.PUBLIC_DOMAIN);
        (0, vitest_1.expect)((0, loader_1.parse_license)('RESTRICTED - non-commercial')).toBe(loader_1.LicenseTerm.UNVERIFIED);
        (0, vitest_1.expect)((0, loader_1.parse_license)(undefined)).toBe(loader_1.LicenseTerm.UNVERIFIED);
        (0, vitest_1.expect)((0, loader_1.load)('tr', PACK_ROOT).commercial_use).toBe(loader_1.CommercialUse.PROHIBITED);
        (0, vitest_1.expect)((0, loader_1.load)('ja_JP', PACK_ROOT).commercial_use).toBe(loader_1.CommercialUse.UNKNOWN);
    });
    (0, vitest_1.it)('refuses restricted and unverified packs in commercial mode', () => {
        (0, vitest_1.expect)(() => (0, loader_1.load)('tr', PACK_ROOT, { commercial_mode: true })).toThrow(loader_1.RestrictedPackError);
        (0, vitest_1.expect)(() => (0, loader_1.load)('ja_JP', PACK_ROOT, { commercial_mode: true })).toThrow(loader_1.RestrictedPackError);
        (0, vitest_1.expect)(() => (0, loader_1.load)('en_US', PACK_ROOT, { commercial_mode: true })).not.toThrow();
    });
    (0, vitest_1.it)('does not let a development cache warm bypass the licence gate', () => {
        (0, vitest_1.expect)((0, loader_1.load)('tr', PACK_ROOT, { commercial_mode: false }).foods).not.toEqual({});
        (0, vitest_1.expect)(() => (0, loader_1.load)('tr', PACK_ROOT, { commercial_mode: true })).toThrow('MEALOG_COMMERCIAL_MODE');
    });
    (0, vitest_1.it)('treats a pack without a licence as unverified and refuses it commercially', () => {
        const root = makeFixtureRoot('license-missing');
        const packPath = (0, node_path_1.join)(root, 'xx_TEST', 'pack.yaml');
        (0, node_fs_1.writeFileSync)(packPath, 'locale: xx_TEST\ncuisine_bucket: other_mixed\nnutrition_source: hand-typed\n');
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(root, 'xx_TEST', 'text_rules.yaml'), '{}\n');
        (0, vitest_1.expect)((0, loader_1.load)('xx_TEST', root).license).toBe(loader_1.LicenseTerm.UNVERIFIED);
        (0, vitest_1.expect)(() => (0, loader_1.load)('xx_TEST', root, { commercial_mode: true })).toThrow(loader_1.RestrictedPackError);
    });
    (0, vitest_1.it)('rebuilds cache when pack content changes, not when mtime changes', () => {
        const root = makeFixtureRoot('content-cache');
        const first = (0, loader_1.load)('xx_TEST', root);
        const foodsPath = (0, node_path_1.join)(root, 'xx_TEST', 'foods.jsonl');
        const oldTime = new Date('2020-01-01T00:00:00Z');
        (0, node_fs_1.utimesSync)(foodsPath, oldTime, oldTime);
        const same = (0, loader_1.load)('xx_TEST', root);
        (0, vitest_1.expect)(same).toBe(first);
        const foods = (0, node_fs_1.readFileSync)(foodsPath, 'utf8').replace('Test food', 'Changed food');
        (0, node_fs_1.writeFileSync)(foodsPath, foods);
        const rebuilt = (0, loader_1.load)('xx_TEST', root);
        (0, vitest_1.expect)(rebuilt).not.toBe(first);
        (0, vitest_1.expect)(rebuilt.foods['xx.test'].name).toBe('Changed food');
    });
});
function makeFixtureRoot(label) {
    const root = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), `mealog-${label}-`));
    (0, node_fs_1.cpSync)((0, node_path_1.join)(PACK_ROOT, 'en_US'), (0, node_path_1.join)(root, 'xx_TEST'), { recursive: true });
    const packPath = (0, node_path_1.join)(root, 'xx_TEST', 'pack.yaml');
    (0, node_fs_1.writeFileSync)(packPath, (0, node_fs_1.readFileSync)(packPath, 'utf8').replaceAll('en_US', 'xx_TEST').replace('western', 'other_mixed'));
    const foodsPath = (0, node_path_1.join)(root, 'xx_TEST', 'foods.jsonl');
    (0, node_fs_1.writeFileSync)(foodsPath, (0, node_fs_1.readFileSync)(foodsPath, 'utf8')
        .split(/\r?\n/)
        .filter(Boolean)
        .slice(0, 1)
        .map((line) => line
        .replace(/"food_id"\s*:\s*"[^"]+"/, '"food_id":"xx.test"')
        .replace(/"name"\s*:\s*"[^"]+"/, '"name":"Test food"'))
        .join('\n') + '\n');
    return root;
}
//# sourceMappingURL=locales.loader.test.js.map