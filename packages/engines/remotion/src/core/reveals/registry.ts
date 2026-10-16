// Reveal effect registry. Adding an effect: create one file next to this one and add it below.
import { defineBlockRegistry, registryField, type RegistryFieldOptions } from '../registry.js';
import { blinds } from './blinds.js';
import { circleReveal } from './circle-reveal.js';
import { crossfade } from './crossfade.js';
import { diagonalWipe } from './diagonal-wipe.js';
import { lineWipe } from './line-wipe.js';
import { slideOver } from './slide-over.js';
import { splitSlider } from './split-slider.js';

export const REVEAL_EFFECTS = defineBlockRegistry('Reveal effect', [
  diagonalWipe,
  circleReveal,
  blinds,
  splitSlider,
  slideOver,
  lineWipe,
  crossfade,
]);

export type RevealEffectId = (typeof REVEAL_EFFECTS.items)[number]['id'];

/** Template prop selecting a reveal effect from the registry. */
export const revealEffectField = <const A extends readonly [RevealEffectId, ...RevealEffectId[]]>(
  options: RegistryFieldOptions<RevealEffectId, A>,
) => registryField(REVEAL_EFFECTS, options);
