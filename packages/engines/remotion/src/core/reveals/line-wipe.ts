import { ease, mix } from '../motion.js';
import { defineReveal } from './types.js';

/**
 * Toward the top-right corner; with a corner direction the edge stays parallel to the frame's
 * top-left -> bottom-right diagonal, whatever the aspect (references/2).
 */
const DIRECTION = 'to top right';
/** Half-width of the white line, percent of the gradient line (~2 px at 1080 x 1920). */
const LINE = 0.14;

export const lineWipe = defineReveal({
  id: 'line-wipe',
  durationSec: 0.7,
  revealedAt: 0.5,
  label: 'Diagonal line wipe',
  description: 'A crisp diagonal wipe from the bottom-left corner, led by a thin white line.',
  render: ({ progress }) => {
    const edge = mix(-1, 101, ease.inOutCubic(progress));
    const mask = `linear-gradient(${DIRECTION}, #000 ${edge.toFixed(3)}%, transparent ${(edge + 0.02).toFixed(3)}%)`;
    const visible = progress > 0 && progress < 1;
    return [
      { kind: 'photo', source: 'before' },
      { kind: 'photo', source: 'after', style: { maskImage: mask, WebkitMaskImage: mask } },
      ...(visible
        ? [
            {
              kind: 'fill' as const,
              style: {
                background: `linear-gradient(${DIRECTION}, transparent ${(edge - LINE).toFixed(3)}%, rgba(255,255,255,0.95) ${(edge - LINE).toFixed(3)}%, rgba(255,255,255,0.95) ${(edge + LINE).toFixed(3)}%, transparent ${(edge + LINE).toFixed(3)}%)`,
              },
            },
          ]
        : []),
    ];
  },
});
