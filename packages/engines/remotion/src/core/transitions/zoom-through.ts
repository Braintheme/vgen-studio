import { ease, mix } from '../motion.js';
import { defineTransition } from './types.js';

export const zoomThrough = defineTransition({
  id: 'zoom-through',
  label: 'Zoom through',
  description: 'Energetic: the previous scene zooms past the camera, the next one zooms into place.',
  frame: ({ progress, direction }) => {
    const t = ease.inOutCubic(progress);
    if (direction === 'exiting') {
      return {
        style: {
          transform: `scale(${mix(1, 1.35, t).toFixed(4)})`,
          filter: `blur(${mix(0, 18, t).toFixed(2)}px)`,
        },
      };
    }
    const blur = mix(14, 0, t);
    return {
      style: {
        opacity: ease.outCubic(progress),
        transform: `scale(${mix(0.88, 1, t).toFixed(4)})`,
        filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined,
      },
    };
  },
});
