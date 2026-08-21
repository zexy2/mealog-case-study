import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app/app.module';

const DEFAULT_PORT = 3000;
const JSON_BODY_LIMIT = '12mb';

/** Keep the JSON parser large enough for the bounded request envelope. */
export function configureBodyParsers(app: NestExpressApplication): void {
  app.useBodyParser('json', { limit: JSON_BODY_LIMIT });
  app.useBodyParser('urlencoded', { extended: true, limit: JSON_BODY_LIMIT });
}

export async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  configureBodyParsers(app);
  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  await app.listen(port);
}

/* istanbul ignore next -- entrypoint guard, not exercised by the test run. */
if (require.main === module) {
  bootstrap().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
