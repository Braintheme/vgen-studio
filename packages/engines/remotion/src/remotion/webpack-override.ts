import type { WebpackOverrideFn } from '@remotion/bundler';

/**
 * Aligns Remotion's webpack resolution with our TypeScript setup:
 * - NodeNext-style `./foo.js` specifiers resolve to `./foo.ts(x)` sources;
 * - workspace packages are consumed from sources via the `@vgen/source` condition.
 * Used by both the programmatic bundler and Remotion Studio.
 */
export const webpackOverride: WebpackOverrideFn = (config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    extensionAlias: {
      ...config.resolve?.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
    },
    conditionNames: ['@vgen/source', 'browser', 'import', 'module', 'default'],
  },
});
