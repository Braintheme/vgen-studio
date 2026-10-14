import { seeded, seededRange } from '../random.js';
import { defineBackground, softGlow } from './types.js';

const COUNT = 14;
const COLORS = ['#ffd8a8', '#a5d8ff', '#ffffff'] as const;

export const bokeh = defineBackground({
  id: 'bokeh',
  label: 'Bokeh',
  description: 'Out-of-focus light circles rising slowly and twinkling on a dark base.',
  layers: ({ timeSec, layout, seed, base, accent }) => [
    { background: base },
    ...Array.from({ length: COUNT }, (_, index) => {
      const key = `bokeh-${String(index)}`;
      const size = layout.unit * seededRange(seed, `${key}-size`, 90, 320);
      const speed = layout.unit * seededRange(seed, `${key}-speed`, 10, 34);
      const span = layout.height + size;
      const startY = seeded(seed, `${key}-y`) * span;
      const y = layout.height - ((startY + timeSec * speed) % span);
      const x = seeded(seed, `${key}-x`) * layout.width - size / 2;
      const twinkle = 0.6 + 0.4 * Math.sin(seededRange(seed, `${key}-phase`, 0, 6.28) + timeSec * 1.3);
      const color = index % 4 === 0 ? accent : (COLORS[index % COLORS.length] ?? '#ffffff');
      return {
        width: size,
        height: size,
        left: 0,
        top: 0,
        transform: `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`,
        background: softGlow(color, 0.22 * twinkle),
      };
    }),
  ],
});
