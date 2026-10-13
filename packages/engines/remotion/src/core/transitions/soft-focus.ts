import { ease, mix } from '../motion.js';
import { defineTransition } from './types.js';

export const softFocus = defineTransition({
  id: 'soft-focus',
  label: 'Soft focus',
  description: 'A calm dissolve: the next scene pulls into focus while the previous one softens. No zoom.',
  frame: ({ progress, direction, layout }) => {
    const t = ease.inOutSine(progress);
    if (direction === 'entering') {
      const blur = mix(12, 0, t) * layout.unit;
      return { style: { opacity: t, filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined } };
    }
    const blur = mix(0, 8, t) * layout.unit;
    return { style: { filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined } };
  },
});
