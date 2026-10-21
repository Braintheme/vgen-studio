// Isomorphic entry: engine metadata + template definitions, no renderer code.
import { FORMAT_IDS, type EngineManifest } from '@vgen/shared';
import { beforeAfterCardTemplate } from '../templates/before-after-card/manifest.js';
import { beforeAfterCarouselTemplate } from '../templates/before-after-carousel/manifest.js';
import { beforeAfterTemplate } from '../templates/before-after/manifest.js';
import { paletteGradeTemplate } from '../templates/palette-grade/manifest.js';
import { presetFlipTemplate } from '../templates/preset-flip/manifest.js';
import { presetReelTemplate } from '../templates/preset-reel/manifest.js';

/** Adapter version; build metadata pins the Remotion version it was built against. */
export const REMOTION_ENGINE_VERSION = '0.1.0+remotion.4.0.535';

export const remotionEngineManifest: EngineManifest = {
  id: 'remotion',
  name: 'Remotion',
  version: REMOTION_ENGINE_VERSION,
  capabilities: {
    formats: FORMAT_IDS,
    fps: [30, 60],
    codecs: ['h264'],
    audio: true,
    maxDurationSec: 120,
    browserPreview: true,
    // Image outputs: one frame per slide (`renderStills`).
    stills: true,
  },
  templates: [
    beforeAfterTemplate,
    beforeAfterCardTemplate,
    presetReelTemplate,
    paletteGradeTemplate,
    presetFlipTemplate,
    beforeAfterCarouselTemplate,
  ],
};

export { beforeAfterTemplate } from '../templates/before-after/manifest.js';
export type { BeforeAfterProps } from '../templates/before-after/manifest.js';
export { beforeAfterCardTemplate } from '../templates/before-after-card/manifest.js';
export type { BeforeAfterCardProps } from '../templates/before-after-card/manifest.js';
export { presetReelTemplate } from '../templates/preset-reel/manifest.js';
export type { PresetReelProps } from '../templates/preset-reel/manifest.js';
export { paletteGradeTemplate } from '../templates/palette-grade/manifest.js';
export type { PaletteGradeProps } from '../templates/palette-grade/manifest.js';
export { presetFlipTemplate } from '../templates/preset-flip/manifest.js';
export type { PresetFlipProps } from '../templates/preset-flip/manifest.js';
export { beforeAfterCarouselTemplate } from '../templates/before-after-carousel/manifest.js';
export type { BeforeAfterCarouselProps } from '../templates/before-after-carousel/manifest.js';
