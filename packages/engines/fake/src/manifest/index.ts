// Isomorphic entry: engine metadata + template definitions, no renderer code.
import { FORMAT_IDS, type EngineManifest } from '@vgen/shared';
import { testCardTemplate } from '../templates/test-card/manifest.js';

export const FAKE_ENGINE_VERSION = '0.1.0';

export const fakeEngineManifest: EngineManifest = {
  id: 'fake',
  name: 'Fake (dev stub)',
  version: FAKE_ENGINE_VERSION,
  capabilities: {
    formats: FORMAT_IDS,
    fps: [30, 60],
    codecs: ['h264'],
    audio: true,
    maxDurationSec: 10,
    // No browser player: the admin falls back to a poster frame rendered by the worker.
    browserPreview: false,
    // No still-image output (templates with `output: 'stills'`).
    stills: false,
  },
  templates: [testCardTemplate],
};

export { testCardTemplate } from '../templates/test-card/manifest.js';
export type { TestCardProps } from '../templates/test-card/manifest.js';
