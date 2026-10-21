# Adding a render engine

An engine is a package with a manifest, a server adapter and (optionally) a browser player, plus a
thin worker app. The `fake` engine (`packages/engines/fake`, `apps/worker-fake`) is a complete,
minimal example: it renders with plain ffmpeg and has no browser player. It is hidden by default;
`make fake-on` starts its worker and shows its template, `make fake-off` hides it again.

## 1. The package (`packages/engines/<id>`)

```
package.json      name @vgen/engine-<id>; exports ./manifest, ./server (+ ./player)
src/manifest/     EngineManifest: id, name, version, capabilities, templates (isomorphic)
src/templates/    template manifests (defineTemplate) + engine-specific rendering code
src/server/       RenderEngine adapter (workers only)
src/player/       PlayerAdapter (browser, optional)
```

Exports follow the workspace convention: `"@vgen/source"` → `src/...ts`, `types`/`default` →
`dist/...` (built with `tsc` for production images).

```ts
// src/manifest/index.ts
export const myEngineManifest: EngineManifest = {
  id: 'my-engine',
  name: 'My engine',
  version: '0.1.0+renderer.1.2.3', // adapter version (+ renderer version as build metadata)
  capabilities: {
    formats: FORMAT_IDS, // 9:16, 16:9, 1:1, 4:5, 3:4
    fps: [30, 60],
    codecs: ['h264'],
    audio: true,
    maxDurationSec: 60,
    browserPreview: false, // true only with a ./player adapter
    stills: false, // true with renderStills (templates with `output: 'stills'`)
  },
  templates: [myTemplate],
};
```

```ts
// src/server/index.ts
export const createMyEngine = (): RenderEngine => ({
  ...myEngineManifest,
  init: async () => {}, // one-time warm-up (bundling, downloads)
  async render(input, { outputPath, onProgress, signal }) {
    // input: template, validated props, assets ({ media: { slot: { src, width, height } }, music }),
    // metadata (width, height, fps, frames), encoding (crf, preset, bitrates)
  },
  async renderStill(input, { outputPath, frame, signal }) {}, // JPEG; used for previews
  // Optional, with capabilities.stills: every frame as a lossless image, in frame order.
  // async renderStills(input, { outputDir, scale, onProgress, signal }) { return [...pngPaths]; },
  dispose: async () => {},
});
```

The contract asks for little: write an MP4 to `outputPath`, report progress in 0..1, stop when
`signal` aborts. `worker-core` does everything around it: job state, asset preparation (photos are
normalized and served on a loopback URL), retries, cancel, delivery post-processing (faststart,
AAC 48 kHz, silent track), thumbnails, storage, progress events.

## 2. Register it

- `packages/catalog/src/index.ts`: add the manifest to `ENGINE_MANIFESTS` (and the package to
  the catalog's dependencies). The API serves its templates; renders go to `render-<id>`.
- Browser player (optional): `packages/catalog/src/players.ts` → `PLAYER_LOADERS[<id>]`, a lazy
  import of your `PlayerAdapter` (`mount(element, input)` → a `PlayerHandle` with `update`, `play`,
  `pause`, `seekTo`, `subscribe`, `destroy`). Without it the
  admin shows poster frames rendered by your `renderStill` (`POST /previews`).

## 3. The worker app (`apps/worker-<id>`)

```ts
// src/main.ts
import { createMyEngine } from '@vgen/engine-my-engine/server';
import { runWorker } from '@vgen/worker-core';

await runWorker({ engine: createMyEngine() });
```

Copy `apps/worker-fake` (package.json scripts, tsconfig) and add:

- a service in `docker-compose.yml` (dev; see `worker-fake`), with its own image if the engine
  needs system packages (fonts, browsers, binaries) — engines never share runtime dependencies;
- a target in `docker/prod.Dockerfile` (`pnpm deploy` the app, add system packages, prebuild
  what you can at image build) and a service in `docker-compose.prod.yml`.

To hide an installed engine (e.g. a stub in production) set `DISABLED_ENGINES=<id>` for the API.

## 4. Check

- `make lint` (boundaries, catalog), `make test` (the catalog test bundles all manifests for the
  browser and fails on renderer imports);
- `make test-e2e` renders `test-card` when the fake engine is enabled — extend the script for
  your engine's template.
