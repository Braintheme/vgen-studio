import { defineConfig } from 'vitest/config';

// Workspace packages are resolved from their TypeScript sources (see README).
const conditions = ['@vgen/source'];

export default defineConfig({
  resolve: { conditions },
  ssr: { resolve: { conditions, externalConditions: conditions } },
  test: {
    include: ['{apps,packages}/**/src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    environment: 'node',
  },
});
