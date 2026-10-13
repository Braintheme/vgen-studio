// @ts-check
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import vue from 'eslint-plugin-vue';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { adminLayerConfigs, adminVueConfig } from './apps/admin/eslint.layers.js';

/** Packages that only engine adapters (and the catalog) may depend on. */
const ENGINE_SPECIFIC = ['remotion', '@remotion/*', 'react', 'react-dom', 'react/*', '@vgen/engine-*'];

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.remotion-bundle/**',
      '**/coverage/**',
      'apps/admin/src/components/ui/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...vue.configs['flat/recommended'],
  {
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: {
        projectService: { allowDefaultProject: ['vitest.config.ts'] },
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.vue'],
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // Nest modules are classes with decorators only.
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
    },
  },
  {
    // NestJS relies on runtime class references for DI (emitDecoratorMetadata).
    files: ['apps/api/**/*.ts', 'packages/db/**/*.ts', 'packages/worker-core/**/*.ts', 'tools/**/*.ts'],
    rules: { '@typescript-eslint/consistent-type-imports': 'off' },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { parser: tseslint.parser },
    },
  },
  {
    files: ['apps/admin/**/*.{ts,vue}'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    ...tseslint.configs.disableTypeChecked,
  },

  // --- Architecture boundaries ---------------------------------------------
  {
    // The core never depends on a concrete render engine (the admin's layer rules include this too).
    files: ['apps/api/**', 'apps/admin/src/**', 'packages/shared/**', 'packages/db/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ENGINE_SPECIFIC,
              message:
                'Core code must stay engine-agnostic. Go through @vgen/catalog and the shared contracts.',
            },
          ],
        },
      ],
    },
  },
  {
    // Contracts and persistence sit below the catalog; importing it would create a cycle.
    files: ['packages/shared/**', 'packages/db/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [...ENGINE_SPECIFIC, '@vgen/catalog'],
              message: 'Contracts must not depend on engines or the catalog.',
            },
          ],
        },
      ],
    },
  },
  {
    // Template manifests are isomorphic: imported by the API and the browser.
    // (packages/catalog's isomorphism test also checks this transitively.)
    files: ['packages/engines/*/src/manifest/**', 'packages/engines/*/src/templates/*/manifest.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['remotion', '@remotion/*', 'react', 'react-dom', 'sharp', 'node:*'],
              message: 'Manifests must not import renderer, React or Node-only code.',
            },
          ],
        },
      ],
    },
  },
  {
    // Renders must be deterministic.
    files: ['packages/engines/**/src/**'],
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: "Use remotion's random(seed) instead." },
        { object: 'Date', property: 'now', message: 'Renders must not depend on wall-clock time.' },
      ],
    },
  },
  // Admin: layered architecture + Vue conventions (after the generic rules so they take precedence).
  ...adminLayerConfigs,
  adminVueConfig,
  prettier,
);
