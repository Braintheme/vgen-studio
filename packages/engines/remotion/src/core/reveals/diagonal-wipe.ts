import { bell, ease, mix } from '../motion.js';
import { defineReveal } from './types.js';

const ANGLE = 112;
const FEATHER = 1.2;

export const diagonalWipe = defineReveal({
  id: 'diagonal-wipe',
  durationSec: 1.5,
  revealedAt: 0.55,
  label: 'Diagonal wipe with light sweep',
  description: 'A diagonal curtain with a soft edge and a bright flare riding along it.',
  render: ({ progress, accent, layout }) => {
    const edge = mix(-6, 106, ease.inOutCubic(progress));
    const flare = bell(progress);
    // A slight zoom "punch" on the incoming image adds weight to the wipe.
    const punch = mix(1.05, 1, ease.outCubic(progress));
    const mask = `linear-gradient(${ANGLE}deg, #000 ${edge - FEATHER}%, transparent ${edge + FEATHER}%)`;
    return [
      { kind: 'photo', source: 'before' },
      {
        kind: 'photo',
        source: 'after',
        style: { maskImage: mask, WebkitMaskImage: mask, transform: `scale(${punch.toFixed(4)})` },
      },
      {
        kind: 'fill',
        style: {
          mixBlendMode: 'screen',
          background: `linear-gradient(${ANGLE}deg, transparent ${edge - 9}%, rgba(255,236,210,${(0.28 * flare).toFixed(3)}) ${edge - 2.5}%, rgba(255,255,255,${(0.95 * flare).toFixed(3)}) ${edge}%, rgba(255,236,210,${(0.18 * flare).toFixed(3)}) ${edge + 1.6}%, transparent ${edge + 4}%)`,
        },
      },
      {
        kind: 'fill',
        style: {
          mixBlendMode: 'soft-light',
          opacity: 0.6 * flare,
          background: `linear-gradient(${ANGLE}deg, transparent ${edge - 22}%, ${accent} ${edge - 3}%, transparent ${edge + 6}%)`,
          filter: `blur(${(24 * layout.unit).toFixed(1)}px)`,
        },
      },
    ];
  },
});
