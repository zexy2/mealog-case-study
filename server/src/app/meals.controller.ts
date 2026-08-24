import {
  Body,
  Controller,
  Delete,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import {
  ALLOWED_IMAGE_MIME_TYPES,
  isSupportedImageBytes,
} from '../adapters/vision.gemini';
import { VisionInput } from '../pipeline/ports';
import { sanitizeImageBuffer, sanitizePromptInput } from '../pipeline/privacy';
import type { MealLog } from '../domain/models';
import type { CorrectionRequest, ItemCorrection } from '../pipeline/correction';

import { MealsService, type MealRequest } from './meals.service';
import { defaultRateLimiter } from './rate-limiter';
import { Settings, settings } from '../config';

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

interface UploadedImage {
  readonly buffer: Uint8Array;
  readonly mimetype?: string;
}

function invalid(status: HttpStatus, detail: string): never {
  throw new HttpException({ detail }, status);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown, field: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    invalid(HttpStatus.UNPROCESSABLE_ENTITY, `invalid ${field}`);
  }
  return value;
}

function parseSampleId(value: unknown): string | null {
  const parsed = optionalString(value, 'sample_id');
  if (parsed === null) return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(parsed)) {
    invalid(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'invalid sample_id; must contain only alphanumeric characters, underscores, and hyphens',
    );
  }
  return parsed;
}

function parseFields(body: unknown, multipart: boolean, defaultLocale = settings.default_locale): MealRequest {
  const values = isRecord(body) ? body : {};
  const idempotencyKey = values.idempotency_key;
  const config = values.config === undefined ? 'V3' : values.config;
  const locale = values.locale === undefined ? defaultLocale : values.locale;

  if (
    typeof idempotencyKey !== 'string' ||
    idempotencyKey.trim() === '' ||
    idempotencyKey.length > 256 ||
    typeof config !== 'string' ||
    typeof locale !== 'string'
  ) {
    invalid(
      HttpStatus.UNPROCESSABLE_ENTITY,
      multipart ? 'invalid meal form fields' : 'invalid JSON request',
    );
  }

  return {
    idempotency_key: idempotencyKey,
    sample_id: parseSampleId(values.sample_id),
    locale,
    text: optionalString(values.text, 'text'),
    config,
  };
}

function inputFor(
  request: MealRequest,
  image: UploadedImage | undefined,
  multipart: boolean,
): VisionInput {
  if (image) {
    const mediaType = (image.mimetype ?? '').toLowerCase();
    if (!ALLOWED_IMAGE_MIME_TYPES.has(mediaType)) {
      invalid(HttpStatus.UNSUPPORTED_MEDIA_TYPE, 'unsupported image content type');
    }
    if (image.buffer.length > MAX_IMAGE_BYTES) {
      invalid(HttpStatus.PAYLOAD_TOO_LARGE, 'image exceeds 10 MiB limit');
    }
    if (!isSupportedImageBytes(mediaType, image.buffer)) {
      invalid(HttpStatus.UNSUPPORTED_MEDIA_TYPE, 'unsupported image content');
    }
    const sanitized = sanitizeImageBuffer(image.buffer);
    const cleanText = request.text ? sanitizePromptInput(request.text).cleanText : request.text;
    return new VisionInput({
      imageBytes: sanitized,
      imageMediaType: mediaType,
      text: cleanText,
      sampleId: request.sample_id,
    });
  }

  try {
    const cleanText = request.text ? sanitizePromptInput(request.text).cleanText : request.text;
    return new VisionInput({ sampleId: request.sample_id, text: cleanText });
  } catch {
    invalid(
      HttpStatus.UNPROCESSABLE_ENTITY,
      multipart
        ? 'multipart request needs image, text, or sample_id'
        : 'request needs image, text, or sample_id',
    );
  }
}

function parseCorrectionRequest(body: unknown): CorrectionRequest {
  if (!isRecord(body) || !isRecord(body.meal) || !Array.isArray(body.corrections)) {
    invalid(HttpStatus.UNPROCESSABLE_ENTITY, 'correction request needs meal and corrections');
  }

  const corrections = body.corrections.map((value, index): ItemCorrection => {
    if (!isRecord(value) || typeof value.item_index !== 'number') {
      invalid(HttpStatus.UNPROCESSABLE_ENTITY, `invalid correction at index ${index}`);
    }
    const correction: ItemCorrection = { item_index: value.item_index };
    if (Object.prototype.hasOwnProperty.call(value, 'food_id')) {
      if (value.food_id !== undefined && typeof value.food_id !== 'string') {
        invalid(HttpStatus.UNPROCESSABLE_ENTITY, `invalid food_id at correction ${index}`);
      }
      correction.food_id = value.food_id;
    }
    if (Object.prototype.hasOwnProperty.call(value, 'quantity')) {
      if (value.quantity !== null && typeof value.quantity !== 'number') {
        invalid(HttpStatus.UNPROCESSABLE_ENTITY, `invalid quantity at correction ${index}`);
      }
      correction.quantity = value.quantity;
    }
    if (Object.prototype.hasOwnProperty.call(value, 'unit')) {
      if (value.unit !== null && typeof value.unit !== 'string') {
        invalid(HttpStatus.UNPROCESSABLE_ENTITY, `invalid unit at correction ${index}`);
      }
      correction.unit = value.unit;
    }
    if (Object.prototype.hasOwnProperty.call(value, 'grams')) {
      if (typeof value.grams !== 'number') {
        invalid(HttpStatus.UNPROCESSABLE_ENTITY, `invalid grams at correction ${index}`);
      }
      correction.grams = value.grams;
    }
    return correction;
  });

  return {
    meal: body.meal as unknown as MealLog,
    corrections,
  };
}

@Controller('v1')
export class MealsController {
  constructor(
    @Inject(MealsService) private readonly meals: MealsService,
    @Inject(Settings) private readonly runtimeSettings: Settings = settings,
  ) {}

  @Post('meals/correct')
  @HttpCode(HttpStatus.OK)
  correct(@Body() body: unknown): MealLog {
    return this.meals.correctMeal(parseCorrectionRequest(body));
  }

  @Post('meals')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: MAX_IMAGE_BYTES } }))
  async create(
    @Body() body: unknown,
    @UploadedFile() image: UploadedImage | undefined,
    @Headers('content-type') contentType: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
  ): Promise<unknown> {
    const multipart = (contentType ?? '').toLowerCase().startsWith('multipart/form-data');
    const request = parseFields(body, multipart, this.runtimeSettings.default_locale);

    const isPendingOrCompleted = this.meals.hasPendingOrCompleted(userId, request.idempotency_key);
    if (!isPendingOrCompleted) {
      const rateKey = userId && userId.trim() ? userId.trim() : 'demo-user';
      const rate = defaultRateLimiter.check(rateKey);
      if (!rate.allowed) {
        invalid(
          HttpStatus.TOO_MANY_REQUESTS,
          'rate limit exceeded; please wait before logging another meal',
        );
      }
    }

    const input = inputFor(request, image, multipart);
    return this.meals.logMeal(request, input, userId);
  }

  /** GDPR Article 17: Right to be Forgotten data deletion */
  @Delete('users/:id/data')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteUserData(
    @Param('id') id: string,
    @Headers('x-user-id') authUserId: string | undefined,
  ): void {
    if (!id || id.trim() === '') {
      invalid(HttpStatus.BAD_REQUEST, 'invalid user id');
    }
    const cleanId = id.trim();
    if (!authUserId || authUserId.trim() !== cleanId) {
      invalid(
        HttpStatus.FORBIDDEN,
        'forbidden: X-User-Id header does not match requested user id',
      );
    }
    this.meals.purgeUserData(cleanId);
    defaultRateLimiter.reset(cleanId);
  }
}
