import { bell, ease, mix } from '../motion.js';
import { seededRange } from '../random.js';
import { defineReveal } from './types.js';

export const circleReveal = defineReveal({
  id: 'circle-reveal',
  durationSec: 1.5,
  revealedAt: 0.55,
  label: 'Circular reveal',
  description: 'A circular mask opening from a point of interest, with a glowing rim and a zoom settle.',
  render: ({ progress, layout, accent, seed }) => {
    const { width, height, unit } = layout;
    // Origin slightly off-center (deterministic per seed) feels less mechanical.
    const cx = width * seededRange(seed, 'circle-x', 0.42, 0.58);
    const cy = height * seededRange(seed, 'circle-y', 0.38, 0.5);
    const farthest = Math.max(
      Math.hypot(cx, cy),
      Math.hypot(width - cx, cy),
      Math.hypot(cx, height - cy),
      Math.hypot(width - cx, height - cy),
    );
    const t = ease.inOutCubic(progress);
    const radius = mix(0, farthest * 1.04, t);
    const feather = 10 * unit;
    const rim = bell(progress) * (1 - progress * 0.4);
    const zoom = mix(1.14, 1, ease.outQuint(progress));
    const mask = `radial-gradient(circle at ${cx}px ${cy}px, #000 ${Math.max(0, radius - feather)}px, transparent ${radius}px)`;
    return [
      { kind: 'photo', source: 'before', style: { transform: `scale(${mix(1, 1.04, t).toFixed(4)})` } },
      {
        kind: 'fill',
        style: { maskImage: mask, WebkitMaskImage: mask },
        children: [
          {
            kind: 'photo',
            source: 'after',
            style: { transform: `scale(${zoom.toFixed(4)})`, transformOrigin: `${cx}px ${cy}px` },
          },
        ],
      },
      ...(rim > 0.01
        ? [
            {
              kind: 'box' as const,
              style: {
                left: cx - radius,
                top: cy - radius,
                width: radius * 2,
                height: radius * 2,
                borderRadius: '50%',
                border: `${3 * unit}px solid rgba(255,255,255,${(0.85 * rim).toFixed(3)})`,
                boxShadow: `0 0 ${40 * unit}px ${12 * unit}px rgba(255,240,220,${(0.35 * rim).toFixed(3)}), inset 0 0 ${60 * unit}px ${accent}`,
              },
            },
          ]
        : []),
    ];
  },
});
