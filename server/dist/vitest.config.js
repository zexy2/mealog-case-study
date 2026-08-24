"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
exports.default = (0, config_1.defineConfig)({
    test: {
        environment: 'node',
        include: ['test/**/*.test.ts'],
        // server/tests/ is the Python suite and server/src/mealog/ is the Python
        // backend; both stay untouched until the port epic's parity gate passes.
        exclude: ['node_modules/**', 'dist/**', 'tests/**', 'src/mealog/**'],
    },
    esbuild: {
        // NestJS relies on TypeScript's legacy decorator semantics. esbuild reads
        // experimentalDecorators from tsconfig.json; pinning the target keeps the
        // transform consistent with the tsc build.
        target: 'es2022',
    },
});
//# sourceMappingURL=vitest.config.js.map