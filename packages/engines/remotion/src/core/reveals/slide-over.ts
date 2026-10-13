import { ease } from '../motion.js';
import { defineReveal } from './types.js';

/**
 * The after photo slides in from the right over the still before photo, carried by a hard
 * vertical edge: a quick, decisive start that settles softly (outQuint).
 */
export const slideOver = defineReveal({
  id: 'slide-over',
  durationSec: 1.03,
  revealedAt: 0.58,
  label: 'Slide over',
  description: 'The after photo slides in from the right over the before photo.',
  render: ({ progress }) => {
    const offset = (1 - ease.outQuint(progress)) * 100;
    return [
      { kind: 'photo', source: 'before' },
      { kind: 'photo', source: 'after', style: { transform: `translate3d(${offset.toFixed(3)}%, 0, 0)` } },
    ];
  },
});
