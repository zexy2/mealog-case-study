import type { MealLog } from '../domain/models';
import { MealsService } from './meals.service';
export declare const MAX_IMAGE_BYTES: number;
interface UploadedImage {
    readonly buffer: Uint8Array;
    readonly mimetype?: string;
}
export declare class MealsController {
    private readonly meals;
    constructor(meals: MealsService);
    correct(body: unknown): MealLog;
    create(body: unknown, image: UploadedImage | undefined, contentType: string | undefined, userId: string | undefined): Promise<unknown>;
    /** GDPR Article 17: Right to be Forgotten data deletion */
    deleteUserData(id: string): void;
}
export {};
