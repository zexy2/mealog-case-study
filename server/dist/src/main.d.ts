import 'reflect-metadata';
import type { NestExpressApplication } from '@nestjs/platform-express';
/** Keep the JSON parser large enough for the bounded request envelope. */
export declare function configureBodyParsers(app: NestExpressApplication): void;
export declare function bootstrap(): Promise<void>;
