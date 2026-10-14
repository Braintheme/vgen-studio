// Animated background registry. Adding a background: create one file next to this one and add it below.
import { defineBlockRegistry, registryField, type RegistryFieldOptions } from '../registry.js';
import { aurora } from './aurora.js';
import { bokeh } from './bokeh.js';
import { lightStreaks } from './light-streaks.js';
import { softGradient } from './soft-gradient.js';
import { solid } from './solid.js';

export const BACKGROUNDS = defineBlockRegistry('Background', [
  lightStreaks,
  aurora,
  softGradient,
  bokeh,
  solid,
]);

export type BackgroundId = (typeof BACKGROUNDS.items)[number]['id'];

/** Template prop selecting an animated background. */
export const backgroundField = <const A extends readonly [BackgroundId, ...BackgroundId[]]>(
  options: RegistryFieldOptions<BackgroundId, A>,
) => registryField(BACKGROUNDS, options);
