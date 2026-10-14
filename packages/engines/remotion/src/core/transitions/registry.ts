// Scene transition registry. Adding a transition: create one file next to this one and add it below.
import { defineBlockRegistry, registryField, type RegistryFieldOptions } from '../registry.js';
import { fade } from './fade.js';
import { lightPass } from './light-pass.js';
import { none } from './none.js';
import { punchZoom } from './punch-zoom.js';
import { slideUp } from './slide-up.js';
import { softFocus } from './soft-focus.js';
import { zoomThrough } from './zoom-through.js';

export const SEAM_TRANSITIONS = defineBlockRegistry('Transition', [
  softFocus,
  fade,
  lightPass,
  slideUp,
  zoomThrough,
  none,
  punchZoom,
]);

export type SeamTransitionId = (typeof SEAM_TRANSITIONS.items)[number]['id'];

/** Template prop selecting the transition used at one scene seam. */
export const seamTransitionField = <const A extends readonly [SeamTransitionId, ...SeamTransitionId[]]>(
  options: RegistryFieldOptions<SeamTransitionId, A>,
) => registryField(SEAM_TRANSITIONS, options);
