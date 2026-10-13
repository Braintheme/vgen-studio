import { clamp01, ease } from '../motion.js';
import type { SceneNode } from '../scene/spec.js';
import { defineReveal } from './types.js';

/** Each slat opens over this share of the timeline; starts cascade across the rest. */
const SPAN = 0.38;

export const blinds = defineReveal({
  id: 'blinds',
  durationSec: 1.5,
  revealedAt: 0.6,
  label: 'Blinds',
  description: 'Venetian blinds: horizontal slats open from their center lines, top to bottom.',
  render: ({ progress, layout }) => {
    const { height, unit } = layout;
    const count = Math.max(8, Math.round(height / (120 * unit)));
    const slat = height / count;
    const nodes: SceneNode[] = [{ kind: 'photo', source: 'before' }];

    for (let index = 0; index < count; index += 1) {
      const start = (index / (count - 1)) * (1 - SPAN);
      const local = ease.inOutCubic(clamp01((progress - start) / SPAN));
      if (local <= 0) {
        continue;
      }
      const half = (slat / 2) * local;
      const center = index * slat + slat / 2;
      // A pixel of overlap hides hairline seams between fully open slats.
      const clipTop = Math.max(0, center - half - 0.5);
      const clipBottom = Math.max(0, height - (center + half + 0.5));
      const children: SceneNode[] = [{ kind: 'photo', source: 'after' }];
      if (local < 1) {
        // Shading suggests the slats rotating; a light catch runs along the edge.
        const shade = (0.55 * (1 - local)).toFixed(3);
        children.push(
          {
            kind: 'box',
            style: {
              left: 0,
              right: 0,
              top: clipTop,
              height: half * 2 + 1,
              background: `linear-gradient(180deg, rgba(0,0,0,${shade}) 0%, rgba(0,0,0,0) 50%, rgba(0,0,0,${shade}) 100%)`,
            },
          },
          {
            kind: 'box',
            style: {
              left: 0,
              right: 0,
              top: clipTop,
              height: 2 * unit,
              background: `rgba(255,248,236,${(0.85 * (1 - local)).toFixed(3)})`,
              boxShadow: `0 0 ${14 * unit}px rgba(255,240,220,${(0.6 * (1 - local)).toFixed(3)})`,
            },
          },
        );
      }
      nodes.push({
        kind: 'fill',
        style: { clipPath: `inset(${clipTop.toFixed(2)}px 0 ${clipBottom.toFixed(2)}px 0)` },
        children,
      });
    }
    return nodes;
  },
});
