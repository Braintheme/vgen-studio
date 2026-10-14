import { seededRange } from '../random.js';
import { defineBackground, withAlpha } from './types.js';

export const softGradient = defineBackground({
  id: 'soft-gradient',
  label: 'Soft gradient',
  description: 'A calm two-tone gradient (base and accent) slowly turning.',
  layers: ({ timeSec, layout, seed, base, accent }) => {
    const size = Math.hypot(layout.width, layout.height) * 1.1;
    const angle = seededRange(seed, 'gradient-angle', 0, 360) + timeSec * 6;
    return [
      { background: base },
      {
        width: size,
        height: size,
        left: 0,
        top: 0,
        transform: `translate3d(${((layout.width - size) / 2).toFixed(2)}px, ${((layout.height - size) / 2).toFixed(2)}px, 0) rotate(${angle.toFixed(3)}deg)`,
        background: `linear-gradient(180deg, ${withAlpha(accent, 0.34)} 0%, ${withAlpha(accent, 0.12)} 35%, transparent 60%, ${withAlpha('#000000', 0.35)} 100%)`,
      },
    ];
  },
});
