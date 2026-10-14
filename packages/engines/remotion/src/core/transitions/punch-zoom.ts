import { ease, mix } from '../motion.js';
import { defineTransition } from './types.js';

/** Fitted to references/2: the exit zooms ~1.8x while accelerating, the next scene lands from ~0.86. */
const EXIT_SCALE = 1.85;
const ENTER_SCALE = 0.86;
const EXIT_BLUR = 14;
const ENTER_BLUR = 4;

export const punchZoom = defineTransition({
  id: 'punch-zoom',
  label: 'Punch zoom',
  description:
    'The previous scene zooms into the camera faster and faster, a hard cut at the peak, and the next scene lands with a short push.',
  frame: ({ progress, direction, layout }) => {
    const half = progress < 0.5;
    if (direction === 'exiting') {
      if (!half) return { style: { opacity: 0 } };
      const t = ease.inCubic(progress / 0.5);
      const blur = EXIT_BLUR * layout.unit * t * t;
      return {
        style: {
          transform: `scale(${mix(1, EXIT_SCALE, t).toFixed(4)})`,
          filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined,
        },
        // Darkens toward the cut so the jump into the next scene reads as one move.
        overlay: { background: `rgba(0, 0, 0, ${(0.4 * t * t).toFixed(3)})` },
      };
    }
    if (half) return { style: { opacity: 0 } };
    const t = ease.outCubic((progress - 0.5) / 0.5);
    const blur = ENTER_BLUR * layout.unit * (1 - t) * (1 - t);
    return {
      style: {
        opacity: 1,
        transform: `scale(${mix(ENTER_SCALE, 1, t).toFixed(4)})`,
        filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined,
      },
    };
  },
});
