import { bell, ease, mix } from '../motion.js';
import { defineTransition } from './types.js';

export const lightPass = defineTransition({
  id: 'light-pass',
  label: 'Light pass',
  description: 'A soft band of warm light glides across the frame while the scenes dissolve.',
  frame: ({ progress, direction }) => {
    if (direction === 'exiting') {
      return {};
    }
    const center = mix(-20, 120, ease.inOutSine(progress));
    const glow = (0.42 * bell(progress)).toFixed(3);
    return {
      style: { opacity: ease.inOutCubic(progress) },
      overlay: {
        mixBlendMode: 'screen',
        background: `linear-gradient(105deg, rgba(255,236,214,0) ${center - 28}%, rgba(255,236,214,${glow}) ${center}%, rgba(255,236,214,0) ${center + 28}%)`,
      },
    };
  },
});
