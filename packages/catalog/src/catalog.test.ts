import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { resolveTemplateDefaults } from '@vgen/shared';
import { describe, expect, it } from 'vitest';
import { createCatalog, ENGINE_MANIFESTS } from './index.js';

const here = path.dirname(fileURLToPath(import.meta.url));

describe('catalog', () => {
  it('registers every installed engine and its templates', () => {
    const { engines, templates } = createCatalog();
    expect(engines.list().map((engine) => engine.id)).toEqual(ENGINE_MANIFESTS.map((engine) => engine.id));
    expect(templates.get('before-after').engine).toBe('remotion');
  });

  it('every template resolves its defaults', () => {
    for (const template of createCatalog().templates.list()) {
      expect(() => resolveTemplateDefaults(template)).not.toThrow();
    }
  });

  // The catalog is imported by the API and the browser: it must never pull in
  // renderer, React or Node-only code, even transitively.
  it('is isomorphic (no renderer / React / Node built-ins in its module graph)', async () => {
    const result = await build({
      entryPoints: [path.join(here, 'index.ts')],
      bundle: true,
      write: false,
      metafile: true,
      platform: 'browser',
      format: 'esm',
      conditions: ['@vgen/source'],
      logLevel: 'silent',
    });
    const inputs = Object.keys(result.metafile.inputs);
    const forbidden = inputs.filter((input) =>
      /node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?(?:remotion|@remotion|react|react-dom|sharp)\//.test(
        input,
      ),
    );
    expect(forbidden).toEqual([]);
  });
});
