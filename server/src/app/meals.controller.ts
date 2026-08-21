import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { ALLOWED_IMAGE_MIME_TYPES } from '../adapters/vision.gemini';
import { VisionInput } from '../pipeline/ports';

import { MealsService, type MealRequest } from './meals.service';

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

function parseFields(body: unknown, multipart: boolean): MealRequest {
  const values = isRecord(body) ? body : {};
  const idempotencyKey = values.idempotency_key;
  const config = values.config === undefined ? 'V3' : values.config;
  const locale = values.locale === undefined ? 'en_US' : values.locale;

  if (typeof idempotencyKey !== 'string' || typeof config !== 'string' || typeof locale !== 'string') {
    invalid(
      HttpStatus.UNPROCESSABLE_ENTITY,
      multipart ? 'invalid meal form fields' : 'invalid JSON request',
    );
  }

  return {
    idempotency_key: idempotencyKey,
    sample_id: optionalString(values.sample_id, 'sample_id'),
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
    return new VisionInput({
      imageBytes: image.buffer,
      imageMediaType: mediaType,
      text: request.text,
      sampleId: request.sample_id,
    });
  }

  try {
    return new VisionInput({ sampleId: request.sample_id, text: request.text });
  } catch {
    invalid(
      HttpStatus.UNPROCESSABLE_ENTITY,
      multipart
        ? 'multipart request needs image, text, or sample_id'
        : 'request needs image, text, or sample_id',
    );
  }
}

@Controller('v1/meals')
export class MealsController {
  constructor(@Inject(MealsService) private readonly meals: MealsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: MAX_IMAGE_BYTES } }))
  async create(
    @Body() body: unknown,
    @UploadedFile() image: UploadedImage | undefined,
    @Headers('content-type') contentType: string | undefined,
    @Headers('x-user-id') userId: string | undefined,
  ): Promise<unknown> {
    const multipart = (contentType ?? '').toLowerCase().startsWith('multipart/form-data');
    const request = parseFields(body, multipart);
    const input = inputFor(request, image, multipart);
    return this.meals.logMeal(request, input, userId);
  }
}
