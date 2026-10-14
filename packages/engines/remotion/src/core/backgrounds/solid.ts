import { defineBackground } from './types.js';

export const solid = defineBackground({
  id: 'solid',
  label: 'Solid',
  description: 'The background color with a soft vignette.',
  layers: ({ base }) => [
    { background: base },
    { background: 'radial-gradient(ellipse at 50% 45%, transparent 40%, rgba(0,0,0,0.45) 100%)' },
  ],
});
