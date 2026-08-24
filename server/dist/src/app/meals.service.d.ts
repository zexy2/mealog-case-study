import { Settings } from '../config';
import { VisionInput, type VisionPort } from '../pipeline/ports';
import type { MealLog } from '../domain/models';
import { type CorrectionRequest } from '../pipeline/correction';
export declare const VISION_PORT: unique symbol;
export declare const DEMO_USER_ID = "demo-user";
export interface MealRequest {
    readonly idempotency_key: string;
    readonly sample_id: string | null;
    readonly locale: string;
    readonly text: string | null;
    readonly config: string;
}
/** Edge provider that owns request-level idempotency, not pipeline state. */
export declare class MealsService {
    private readonly vision;
    private readonly runtimeSettings;
    private readonly completed;
    private readonly inFlight;
    constructor(vision: VisionPort, runtimeSettings?: Settings);
    logMeal(request: MealRequest, input: VisionInput, userId: string | undefined): Promise<MealLog>;
    correctMeal(request: CorrectionRequest): MealLog;
    private runOnce;
    /**
     * Which path produced the meal. Photo and text are different products with
     * different failure modes — issue #218 is a photo-path defect that the text
     * path does not have — so the mode has to be on the record.
     */
    private inputModeOf;
}
