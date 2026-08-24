/**
 * Locale-aware text and unit normalization.
 *
 * This is a pure TypeScript port of `server/src/mealog/pipeline/normalize.py`.
 * Locale behaviour comes from the pack; no market name belongs in this module.
 * The pack type is structural so the loader can arrive in a later Wave 1 PR
 * without making normalization depend on transport or framework code.
 */
import type { NormalizedItem, PerceivedItem } from '../domain/models';
export interface TextRules {
    lowercase?: boolean;
    strip_accents?: boolean;
    char_map?: Readonly<Record<string, string>>;
}
export interface LocalePack {
    text_rules: TextRules;
}
/** Apply the text rules owned by a locale pack in their Python order. */
export declare function fold(text: string, pack: LocalePack): string;
/** Parse a portion hint into quantity and the first following unit token. */
export declare function parsePortion(hint: string | null | undefined, pack: LocalePack): [number | null, string | null];
/** Normalize perceived items without changing the original observation. */
export declare function normalize(items: readonly PerceivedItem[], pack: LocalePack, applyRules?: boolean): NormalizedItem[];
