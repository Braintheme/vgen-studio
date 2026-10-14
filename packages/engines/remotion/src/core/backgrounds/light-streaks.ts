import { seededRange } from '../random.js';
import { defineBackground, softBand, softGlow } from './types.js';

/** Colors of the reference (references/2): a violet-blue band, then a warm copper one. */
const BANDS = [
  { color: '#6a6fc0', alpha: 0.42, angle: -30, width: 0.42, period: 9 },
  { color: '#b0705c', alpha: 0.5, angle: -24, width: 0.55, period: 12 },
] as const;

export const lightStreaks = defineBackground({
  id: 'light-streaks',
  label: 'Light streaks',
  description: 'Near black with wide, soft diagonal light bands drifting slowly (light leaks).',
  layers: ({ timeSec, layout, seed, base }) => {
    const diagonal = Math.hypot(layout.width, layout.height);
    const bands = BANDS.map((band, index) => {
      const phase = seededRange(seed, `streak-${String(index)}`, 0, Math.PI * 2);
      const travel = Math.sin(phase + (timeSec * Math.PI * 2) / band.period);
      const breathe = 0.75 + 0.25 * Math.sin(phase * 1.7 + (timeSec * Math.PI * 2) / (band.period * 0.7));
      const width = band.width * layout.width;
      const x = layout.width * (0.5 + 0.38 * travel) - width / 2;
      return {
        // An oversized band centered vertically, rotated around its own center.
        width,
        height: diagonal * 1.2,
        left: 0,
        top: 0,
        transform: `translate3d(${x.toFixed(2)}px, ${((layout.height - diagonal * 1.2) / 2).toFixed(2)}px, 0) rotate(${String(band.angle)}deg)`,
        background: softBand(band.color, band.alpha * breathe),
        opacity: 1,
      };
    });
    return [
      { background: base },
      ...bands,
      // A dim warm glow low in the frame keeps the black from looking flat.
      {
        width: layout.width * 1.4,
        height: layout.width * 1.4,
        left: 0,
        top: 0,
        transform: `translate3d(${(-layout.width * 0.2).toFixed(2)}px, ${(layout.height - layout.width * 0.55).toFixed(2)}px, 0)`,
        background: softGlow('#4a2219', 0.35),
      },
    ];
  },
});
