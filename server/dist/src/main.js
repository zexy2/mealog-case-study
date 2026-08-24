"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureBodyParsers = configureBodyParsers;
exports.bootstrap = bootstrap;
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app/app.module");
const DEFAULT_PORT = 3000;
const JSON_BODY_LIMIT = '12mb';
/** Keep the JSON parser large enough for the bounded request envelope. */
function configureBodyParsers(app) {
    app.useBodyParser('json', { limit: JSON_BODY_LIMIT });
    app.useBodyParser('urlencoded', { extended: true, limit: JSON_BODY_LIMIT });
}
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { bodyParser: false });
    configureBodyParsers(app);
    const port = Number(process.env.PORT ?? DEFAULT_PORT);
    await app.listen(port);
}
/* istanbul ignore next -- entrypoint guard, not exercised by the test run. */
if (require.main === module) {
    bootstrap().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}
//# sourceMappingURL=main.js.map