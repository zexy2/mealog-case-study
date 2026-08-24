"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalePack = exports.RestrictedPackError = exports._COMMERCIAL_USE = exports.CommercialUse = exports.LicenseTerm = exports.COMMERCIAL_MODE_ENV = exports.PACK_ROOT = void 0;
exports.parse_license = parse_license;
exports.load = load;
exports.available = available;
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const models_1 = require("../domain/models");
const config_1 = require("../config");
/** Repository root's data boundary. Locale names never appear in code. */
function find_pack_root(start = (0, node_path_1.dirname)(__filename)) {
    let current = (0, node_path_1.resolve)(start);
    for (let depth = 0; depth < 10; depth += 1) {
        const candidate = (0, node_path_1.join)(current, 'locale_packs');
        if ((0, node_fs_1.existsSync)(candidate))
            return candidate;
        const parent = (0, node_path_1.dirname)(current);
        if (parent === current)
            break;
        current = parent;
    }
    // Preserve a useful path in the eventual error if the repository is
    // incomplete rather than silently selecting another directory.
    return (0, node_path_1.resolve)(start, '../../../locale_packs');
}
exports.PACK_ROOT = find_pack_root();
exports.COMMERCIAL_MODE_ENV = 'MEALOG_COMMERCIAL_MODE';
var LicenseTerm;
(function (LicenseTerm) {
    LicenseTerm["PUBLIC_DOMAIN"] = "public-domain";
    LicenseTerm["PERMISSIVE"] = "permissive";
    LicenseTerm["RESTRICTED_NONCOMMERCIAL"] = "restricted-noncommercial";
    LicenseTerm["UNVERIFIED"] = "unverified";
})(LicenseTerm || (exports.LicenseTerm = LicenseTerm = {}));
var CommercialUse;
(function (CommercialUse) {
    CommercialUse["ALLOWED"] = "allowed";
    CommercialUse["PROHIBITED"] = "prohibited";
    CommercialUse["UNKNOWN"] = "unknown";
})(CommercialUse || (exports.CommercialUse = CommercialUse = {}));
exports._COMMERCIAL_USE = {
    [LicenseTerm.PUBLIC_DOMAIN]: CommercialUse.ALLOWED,
    [LicenseTerm.PERMISSIVE]: CommercialUse.ALLOWED,
    [LicenseTerm.RESTRICTED_NONCOMMERCIAL]: CommercialUse.PROHIBITED,
    [LicenseTerm.UNVERIFIED]: CommercialUse.UNKNOWN,
};
class RestrictedPackError extends Error {
    constructor(message) {
        super(message);
        this.name = 'RestrictedPackError';
    }
}
exports.RestrictedPackError = RestrictedPackError;
function parse_license(value) {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    return Object.values(LicenseTerm).includes(normalized)
        ? normalized
        : LicenseTerm.UNVERIFIED;
}
/**
 * Parse the deliberately small YAML vocabulary used by locale packs.
 *
 * Pack metadata contains scalar fields and folded/literal notes. Text rules
 * additionally contain one nested string map (`char_map`). Keeping this parser
 * local avoids an undeclared runtime dependency while making unsupported input
 * fail loudly instead of silently changing a licence or normalization rule.
 */
function parse_yaml_scalar(value) {
    const trimmed = value.trim();
    if (trimmed === '')
        return null;
    if (trimmed === '{}' || trimmed === '[]')
        return JSON.parse(trimmed);
    if (trimmed === 'true')
        return true;
    if (trimmed === 'false')
        return false;
    if (trimmed === 'null' || trimmed === '~')
        return null;
    if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(trimmed))
        return Number(trimmed);
    if (trimmed.startsWith('"')) {
        return JSON.parse(trimmed);
    }
    if (trimmed.startsWith("'")) {
        if (!trimmed.endsWith("'"))
            throw new Error(`invalid YAML string: ${value}`);
        return trimmed.slice(1, -1).replaceAll("''", "'");
    }
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
            return JSON.parse(trimmed);
        }
        catch {
            throw new Error(`unsupported inline YAML value: ${value}`);
        }
    }
    return trimmed;
}
function strip_yaml_comment(value) {
    let quote = null;
    for (let index = 0; index < value.length; index += 1) {
        const char = value[index];
        if (char === '"' && quote !== 'single' && value[index - 1] !== '\\') {
            quote = quote === 'double' ? null : 'double';
        }
        else if (char === "'" && quote !== 'double') {
            quote = quote === 'single' ? null : 'single';
        }
        else if (char === '#' && quote === null && (index === 0 || /\s/.test(value[index - 1]))) {
            return value.slice(0, index).trimEnd();
        }
    }
    return value;
}
function key_value(line) {
    let quote = null;
    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        if (char === '"' && quote !== 'single' && line[index - 1] !== '\\') {
            quote = quote === 'double' ? null : 'double';
        }
        else if (char === "'" && quote !== 'double') {
            quote = quote === 'single' ? null : 'single';
        }
        else if (char === ':' && quote === null && (index + 1 === line.length || /\s/.test(line[index + 1]))) {
            const rawKey = line.slice(0, index).trim();
            const key = parse_yaml_scalar(rawKey);
            if (typeof key !== 'string')
                throw new Error(`invalid YAML key: ${rawKey}`);
            return [key, line.slice(index + 1).trim()];
        }
    }
    throw new Error(`invalid YAML mapping line: ${line}`);
}
function yaml_lines(text) {
    return text.split(/\r?\n/).map((raw) => {
        const withoutComment = strip_yaml_comment(raw);
        const match = /^( *)/.exec(withoutComment);
        const indent = match?.[1].length ?? 0;
        return { indent, raw: withoutComment, text: withoutComment.trim() };
    });
}
function next_nonblank(lines, index) {
    while (index < lines.length && lines[index].text === '')
        index += 1;
    return index;
}
function parse_yaml_map(lines, start, indent) {
    const result = {};
    let index = start;
    while (index < lines.length) {
        index = next_nonblank(lines, index);
        if (index >= lines.length || lines[index].indent < indent)
            break;
        if (lines[index].indent > indent) {
            throw new Error(`unexpected YAML indentation: ${lines[index].raw}`);
        }
        const line = lines[index];
        const [key, rawValue] = key_value(line.text);
        if (rawValue === '|' || rawValue === '|-' || rawValue === '>' || rawValue === '>-') {
            const folded = rawValue.startsWith('>');
            const block = [];
            let cursor = index + 1;
            let contentIndent = null;
            while (cursor < lines.length) {
                const candidate = lines[cursor];
                if (candidate.text !== '' && candidate.indent <= indent)
                    break;
                if (candidate.text !== '' && contentIndent === null)
                    contentIndent = candidate.indent;
                block.push(candidate.text === '' ? '' : candidate.raw.slice(contentIndent ?? candidate.indent));
                cursor += 1;
            }
            const value = folded ? block.join(' ').replace(/ +/g, ' ').trim() : block.join('\n');
            result[key] = rawValue.endsWith('-') ? value : `${value}\n`;
            index = cursor;
            continue;
        }
        if (rawValue !== '') {
            result[key] = parse_yaml_scalar(rawValue);
            index += 1;
            continue;
        }
        const child = next_nonblank(lines, index + 1);
        if (child < lines.length && lines[child].indent > indent) {
            const [nested, cursor] = parse_yaml_map(lines, child, lines[child].indent);
            result[key] = nested;
            index = cursor;
        }
        else {
            result[key] = {};
            index += 1;
        }
    }
    return [result, index];
}
function parse_yaml(text) {
    const lines = yaml_lines(text);
    const first = next_nonblank(lines, 0);
    if (first >= lines.length)
        return {};
    if (lines[first].indent !== 0)
        throw new Error('YAML document must start at indentation zero');
    if (lines[first].text === '{}')
        return {};
    return parse_yaml_map(lines, first, 0)[0];
}
function read_yaml(path) {
    return parse_yaml((0, node_fs_1.readFileSync)(path, 'utf8'));
}
function read_jsonl(path) {
    if (!(0, node_fs_1.existsSync)(path))
        return [];
    return (0, node_fs_1.readFileSync)(path, 'utf8')
        .split(/\r?\n/)
        .filter((line) => line.trim() !== '')
        .map((line) => JSON.parse(line));
}
function required_string(row, field) {
    const value = row[field];
    if (typeof value !== 'string')
        throw new Error(`locale row requires string field '${field}'`);
    return value;
}
function required_number(row, field) {
    const value = row[field];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(`locale row requires numeric field '${field}'`);
    }
    return value;
}
function optional_number(row, field) {
    const value = row[field];
    if (value === undefined || value === null)
        return null;
    return required_number(row, field);
}
function optional_string(row, field) {
    const value = row[field];
    if (value === undefined || value === null)
        return null;
    if (typeof value !== 'string')
        throw new Error(`locale row field '${field}' must be a string`);
    return value;
}
function string_list(value, field) {
    if (!Array.isArray(value) || !value.every((entry) => typeof entry === 'string')) {
        throw new Error(`locale row field '${field}' must be a string list`);
    }
    return value;
}
function content_hash(directory) {
    const hash = (0, node_crypto_1.createHash)('sha256');
    for (const filename of ['pack.yaml', 'text_rules.yaml', 'foods.jsonl', 'aliases.jsonl', 'units.jsonl']) {
        const path = (0, node_path_1.join)(directory, filename);
        hash.update(filename);
        hash.update('\0');
        if ((0, node_fs_1.existsSync)(path) && (0, node_fs_1.statSync)(path).isFile())
            hash.update((0, node_fs_1.readFileSync)(path));
        else
            hash.update('<missing>');
        hash.update('\0');
    }
    return hash.digest('hex');
}
class LocalePack {
    locale;
    cuisine_bucket;
    nutrition_source;
    license;
    license_note;
    foods;
    aliases;
    negative_aliases;
    units;
    text_rules;
    constructor(init) {
        this.locale = init.locale;
        this.cuisine_bucket = init.cuisine_bucket;
        this.nutrition_source = init.nutrition_source;
        this.license = init.license;
        this.license_note = init.license_note;
        this.foods = init.foods ?? {};
        this.aliases = init.aliases ?? {};
        this.negative_aliases = init.negative_aliases ?? {};
        this.units = init.units ?? {};
        this.text_rules = init.text_rules ?? {};
    }
    get commercial_use() {
        return exports._COMMERCIAL_USE[this.license];
    }
}
exports.LocalePack = LocalePack;
function enforce_commercial_license(pack) {
    const use = pack.commercial_use;
    if (use === CommercialUse.ALLOWED)
        return;
    const reason = use === CommercialUse.PROHIBITED
        ? 'its data licence prohibits commercial use'
        : 'its data licence has not been verified, and unverified is treated as prohibited';
    throw new RestrictedPackError(`locale pack '${pack.locale}' cannot be served in commercial mode: ${reason}. `
        + `license=${pack.license} source=${JSON.stringify(pack.nutrition_source)}. `
        + `Either unset ${exports.COMMERCIAL_MODE_ENV}, drop this pack from the deployment, `
        + 'or replace its nutrition source with one that permits commercial use.');
}
const pack_cache = new Map();
function read_pack(locale, root) {
    const base = (0, node_path_1.resolve)(root ?? exports.PACK_ROOT);
    const directory = (0, node_path_1.join)(base, locale);
    if (!(0, node_fs_1.existsSync)(directory))
        throw new Error(`no locale pack at ${directory}`);
    const key = `${base}\0${locale}\0${content_hash(directory)}`;
    const cached = pack_cache.get(key);
    if (cached)
        return cached;
    const meta = read_yaml((0, node_path_1.join)(directory, 'pack.yaml'));
    const text_rules = read_yaml((0, node_path_1.join)(directory, 'text_rules.yaml'));
    const locale_name = required_string(meta, 'locale');
    const pack = new LocalePack({
        locale: locale_name,
        cuisine_bucket: required_string(meta, 'cuisine_bucket'),
        nutrition_source: required_string(meta, 'nutrition_source'),
        license: parse_license(meta.license),
        license_note: optional_string(meta, 'license_note'),
        text_rules,
    });
    for (const row of read_jsonl((0, node_path_1.join)(directory, 'foods.jsonl'))) {
        const per_100g = row.per_100g;
        if (typeof per_100g !== 'object' || per_100g === null || Array.isArray(per_100g)) {
            throw new Error("locale row requires object field 'per_100g'");
        }
        const raw_packaged = row.packaged;
        if (raw_packaged !== undefined && typeof raw_packaged !== 'boolean') {
            throw new Error("locale row field 'packaged' must be boolean");
        }
        const food = (0, models_1.validateCanonicalFood)({
            food_id: required_string(row, 'food_id'),
            name: required_string(row, 'name'),
            per_100g: (0, models_1.makeNutrients)(per_100g),
            default_serving_g: required_number(row, 'default_serving_g'),
            default_serving_name: required_string(row, 'default_serving_name'),
            source: required_string(row, 'source'),
            locale: pack.locale,
            packaged: raw_packaged ?? false,
            serving_size_g: optional_number(row, 'serving_size_g'),
            serving_size_name: optional_string(row, 'serving_size_name'),
            serving_size_source: optional_string(row, 'serving_size_source'),
            net_weight_g: optional_number(row, 'net_weight_g'),
            net_weight_source: optional_string(row, 'net_weight_source'),
            density_g_per_ml: optional_number(row, 'density_g_per_ml'),
            density_source: optional_string(row, 'density_source'),
        });
        pack.foods[food.food_id] = food;
    }
    for (const row of read_jsonl((0, node_path_1.join)(directory, 'aliases.jsonl'))) {
        const food_id = required_string(row, 'food_id');
        pack.aliases[food_id] = string_list(row.alias ?? [], 'alias');
        if (row.negative_alias)
            pack.negative_aliases[food_id] = string_list(row.negative_alias, 'negative_alias');
    }
    for (const row of read_jsonl((0, node_path_1.join)(directory, 'units.jsonl'))) {
        const unit = required_string(row, 'unit');
        const values = { ...row };
        delete values.unit;
        pack.units[unit] = values;
    }
    pack_cache.set(key, pack);
    return pack;
}
function load(locale, root, options = {}) {
    const pack = read_pack(locale, root);
    const commercial = options.commercial_mode ?? config_1.settings.commercial_mode;
    if (commercial)
        enforce_commercial_license(pack);
    return pack;
}
function available(root) {
    const base = (0, node_path_1.resolve)(root ?? exports.PACK_ROOT);
    return (0, node_fs_1.readdirSync)(base)
        .filter((name) => (0, node_fs_1.existsSync)((0, node_path_1.join)(base, name, 'pack.yaml')))
        .sort();
}
//# sourceMappingURL=loader.js.map