/**
 * Pipeline orchestration and ablation configurations.
 *
 * This is a framework-free port of `server/src/mealog/pipeline/runner.py`.
 * The only external boundary is VisionPort: adapters are supplied by the
 * caller, while every grounded stage remains a pure pipeline module.
 */
import { type MealLog } from '../domain/models';
import { VisionInput, type VisionPort } from './ports';
export interface Config {
    readonly name: string;
    readonly description: string;
    readonly grounded: boolean;
    readonly locale_rules: boolean;
    readonly gating: boolean;
}
export declare const CONFIGS: Readonly<Record<string, Config>>;
/**
 * Run one meal through perception, normalization, retrieval, resolution,
 * portion, nutrition, and (for V3) confidence routing.
 *
 * `inputRef: string` preserves the Python runner's fixture compatibility path;
 * live callers should pass a VisionInput. A provided VisionPort may be sync or
 * async, which keeps handwritten test stubs as small as the production port.
 */
export declare function run(vision: VisionPort, inputRef: VisionInput | string, locale: string, config: Config, idempotencyKey: string, text?: string | null): Promise<MealLog>;
