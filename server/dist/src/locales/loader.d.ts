import { type CanonicalFood } from '../domain/models';
export declare const PACK_ROOT: string;
export declare const COMMERCIAL_MODE_ENV = "MEALOG_COMMERCIAL_MODE";
export declare enum LicenseTerm {
    PUBLIC_DOMAIN = "public-domain",
    PERMISSIVE = "permissive",
    RESTRICTED_NONCOMMERCIAL = "restricted-noncommercial",
    UNVERIFIED = "unverified"
}
export declare enum CommercialUse {
    ALLOWED = "allowed",
    PROHIBITED = "prohibited",
    UNKNOWN = "unknown"
}
export declare const _COMMERCIAL_USE: Readonly<Record<LicenseTerm, CommercialUse>>;
export declare class RestrictedPackError extends Error {
    constructor(message: string);
}
export declare function parse_license(value: unknown): LicenseTerm;
type YamlObject = Record<string, unknown>;
export declare class LocalePack {
    readonly locale: string;
    readonly cuisine_bucket: string;
    readonly nutrition_source: string;
    readonly license: LicenseTerm;
    readonly license_note: string | null;
    readonly foods: Record<string, CanonicalFood>;
    readonly aliases: Record<string, string[]>;
    readonly negative_aliases: Record<string, string[]>;
    readonly units: Record<string, YamlObject>;
    readonly text_rules: YamlObject;
    constructor(init: {
        locale: string;
        cuisine_bucket: string;
        nutrition_source: string;
        license: LicenseTerm;
        license_note: string | null;
        foods?: Record<string, CanonicalFood>;
        aliases?: Record<string, string[]>;
        negative_aliases?: Record<string, string[]>;
        units?: Record<string, YamlObject>;
        text_rules?: YamlObject;
    });
    get commercial_use(): CommercialUse;
}
export declare function load(locale: string, root?: string, options?: {
    commercial_mode?: boolean;
}): LocalePack;
export declare function available(root?: string): string[];
export {};
