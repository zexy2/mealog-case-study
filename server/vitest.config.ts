import { defineConfig } from 'vitest/config';

export default defineConfig({
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
