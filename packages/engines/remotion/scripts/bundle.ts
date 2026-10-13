// Prebuilds the Remotion bundle (production images): workers then skip bundling at startup.
// Usage: pnpm --filter @vgen/engine-remotion bundle <outDir>
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { webpackOverride } from '../src/remotion/webpack-override.js';

const outDir = process.argv[2];
if (!outDir) {
  console.error('usage: bundle <outDir>');
  process.exit(1);
}
const here = path.dirname(fileURLToPath(import.meta.url));
const started = performance.now();
await bundle({
  entryPoint: path.resolve(here, '../src/remotion/index.ts'),
  webpackOverride,
  outDir: path.resolve(outDir),
});
console.log(`bundled into ${outDir} in ${String(Math.round(performance.now() - started))} ms`);
