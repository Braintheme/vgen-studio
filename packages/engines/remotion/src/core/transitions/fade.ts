import { ease } from '../motion.js';
import { defineTransition } from './types.js';

export const fade = defineTransition({
  id: 'fade',
  label: 'Crossfade',
  description: 'The next scene fades in over the previous one.',
  frame: ({ progress, direction }) =>
    direction === 'entering' ? { style: { opacity: ease.inOutSine(progress) } } : {},
});
