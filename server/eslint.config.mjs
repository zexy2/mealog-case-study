// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // The Python backend, its test suite and build output are not ESLint's
    // business. Nothing Python is removed during the port; it is the parity
    // reference until Wave 3.
    ignores: ['dist/**', 'node_modules/**', 'src/mealog/**', 'tests/**', '**/*.py'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // The domain types mirror a Python/JSON wire shape, where snake_case is
      // the contract. Renaming to camelCase would be a breaking change the
      // parity gate reads as a diff.
      '@typescript-eslint/naming-convention': 'off',
    },
  },
  {
    // This config file is not part of the TypeScript program, so the
    // type-aware rules have no type information to work from.
    files: ['**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
