import { ease, mix } from '../motion.js';
import { defineTransition } from './types.js';

export const slideUp = defineTransition({
  id: 'slide-up',
  label: 'Slide up',
  description: 'The next scene slides up, pushing the previous one out of frame.',
  frame: ({ progress, direction }) => {
    const t = ease.inOutCubic(progress);
    return direction === 'entering'
      ? { style: { transform: `translateY(${mix(100, 0, t).toFixed(3)}%)` } }
      : {
          style: {
            transform: `translateY(${mix(0, -30, t).toFixed(3)}%)`,
            filter: `brightness(${mix(1, 0.6, t).toFixed(3)})`,
          },
        };
  },
});
