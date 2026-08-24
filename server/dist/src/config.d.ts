export type Environment = Readonly<Record<string, string | undefined>>;
/** Parse the explicit truthy values used by the Python configuration. */
export declare function _truthy(value: string | undefined): boolean;
/** Runtime settings shared by the edge and framework-free pipeline. */
export declare class Settings {
    readonly vision_provider: string;
    private readonly geminiApiKey;
    readonly default_locale: string;
    readonly log_level: string;
    readonly commercial_mode: boolean;
    constructor(env?: Environment);
    get gemini_api_key(): string | null;
    /** Validate configuration before the application can serve a request. */
    validated(): Settings;
}
/** Importing application configuration fails fast on an invalid environment. */
export declare const settings: Settings;
