// Isomorphic entry: engine metadata + template definitions, no renderer code.
import type { EngineManifest } from '@vgen/shared';
import { beforeAfterCardTemplate } from '../templates/before-after-card/manifest.js';
import { beforeAfterTemplate } from '../templates/before-after/manifest.js';
import { presetReelTemplate } from '../templates/preset-reel/manifest.js';

/** Adapter version; build metadata pins the Remotion version it was built against. */
export const REMOTION_ENGINE_VERSION = '0.1.0+remotion.4.0.535';

export const remotionEngineManifest: EngineManifest = {
  id: 'remotion',
  name: 'Remotion',
  version: REMOTION_ENGINE_VERSION,
  capabilities: {
    formats: ['9:16', '16:9', '1:1', '4:5'],
    fps: [30, 60],
    codecs: ['h264'],
    audio: true,
    maxDurationSec: 120,
    browserPreview: true,
  },
  templates: [beforeAfterTemplate, beforeAfterCardTemplate, presetReelTemplate],
};

export { beforeAfterTemplate } from '../templates/before-after/manifest.js';
export type { BeforeAfterProps } from '../templates/before-after/manifest.js';
export { beforeAfterCardTemplate } from '../templates/before-after-card/manifest.js';
export type { BeforeAfterCardProps } from '../templates/before-after-card/manifest.js';
export { presetReelTemplate } from '../templates/preset-reel/manifest.js';
export type { PresetReelProps } from '../templates/preset-reel/manifest.js';
