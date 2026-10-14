import { seededRange } from '../random.js';
import { defineBackground, softGlow } from './types.js';

const BLOBS = [
  { hue: 'accent', size: 1.1, alpha: 0.38, period: 14 },
  { hue: '#3b5bdb', size: 1.25, alpha: 0.42, period: 17 },
  { hue: '#9c36b5', size: 0.95, alpha: 0.32, period: 11 },
] as const;

export const aurora = defineBackground({
  id: 'aurora',
  label: 'Aurora',
  description: 'Large soft color glows (accent, blue, violet) wandering slowly over a dark base.',
  layers: ({ timeSec, layout, seed, base, accent }) => [
    { background: base },
    ...BLOBS.map((blob, index) => {
      const key = `aurora-${String(index)}`;
      const phaseX = seededRange(seed, `${key}-x`, 0, Math.PI * 2);
      const phaseY = seededRange(seed, `${key}-y`, 0, Math.PI * 2);
      const angle = (timeSec * Math.PI * 2) / blob.period;
      const size = blob.size * Math.max(layout.width, layout.height) * 0.8;
      const cx = layout.width * (0.5 + 0.32 * Math.sin(phaseX + angle));
      const cy = layout.height * (0.5 + 0.3 * Math.sin(phaseY + angle * 0.8));
      return {
        width: size,
        height: size,
        left: 0,
        top: 0,
        transform: `translate3d(${(cx - size / 2).toFixed(2)}px, ${(cy - size / 2).toFixed(2)}px, 0)`,
        background: softGlow(blob.hue === 'accent' ? accent : blob.hue, blob.alpha),
      };
    }),
  ],
});
