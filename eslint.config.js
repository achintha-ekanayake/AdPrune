import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['.wxt/**', '.output/**', 'node_modules/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Build-time Node scripts, not extension code.
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        Buffer: 'readonly',
        console: 'readonly',
        process: 'readonly',
        URL: 'readonly',
      },
    },
  },
  {
    // The MAIN-world layer deliberately touches page globals and patches
    // natives; the usual "don't reassign builtins" instincts don't apply.
    files: ['src/main-world/**/*.ts'],
    rules: {
      'no-global-assign': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
);
