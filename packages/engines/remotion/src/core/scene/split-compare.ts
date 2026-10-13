import type { Layout } from '../layout.js';
import { clamp01 } from '../motion.js';
import { placeAt } from '../placement.js';
import type { SceneNode } from './spec.js';

export interface SplitCompareInput {
  /** Divider position as a fraction of the width: 1 = all "before", 0 = all "after". */
  readonly position: number;
  /** 0..1 visibility of the divider, handle and labels. */
  readonly chrome: number;
  readonly layout: Layout;
  readonly accent: string;
  readonly beforeLabel: string | null;
  readonly afterLabel: string | null;
}

/** Before on the left, after on the right of a glowing divider with a handle and side labels. */
export const splitCompareNodes = ({
  position,
  chrome,
  layout,
  accent,
  beforeLabel,
  afterLabel,
}: SplitCompareInput): SceneNode[] => {
  const { unit, width, height, safe } = layout;
  const x = clamp01(position) * width;
  const labelTop = safe.top + 24 * unit;
  // Labels fade out when their side gets too narrow to hold them.
  const beforeRoom = clamp01((x - 260 * unit) / (120 * unit));
  const afterRoom = clamp01((width - x - 260 * unit) / (120 * unit));

  const nodes: SceneNode[] = [
    { kind: 'photo', source: 'before' },
    { kind: 'photo', source: 'after', style: { clipPath: `inset(0 0 0 ${x.toFixed(2)}px)` } },
  ];
  if (chrome <= 0) {
    return nodes;
  }
  const chromeNodes: SceneNode[] = [
    {
      kind: 'box',
      style: {
        // Follows the slider: transforms only (see core/placement.ts).
        ...placeAt(x - 2 * unit, 0),
        bottom: 0,
        width: 4 * unit,
        background: 'rgba(255,255,255,0.95)',
        boxShadow: `0 0 ${24 * unit}px rgba(255,255,255,0.65), 0 0 ${60 * unit}px ${accent}`,
      },
    },
    { kind: 'handle', x, y: height / 2, size: 92 * unit, scale: 0.6 + 0.4 * chrome },
  ];
  if (beforeLabel && beforeRoom > 0) {
    chromeNodes.push({
      kind: 'label',
      side: 'before',
      text: beforeLabel,
      x: x - 28 * unit,
      y: labelTop,
      align: 'end',
      opacity: beforeRoom,
    });
  }
  if (afterLabel && afterRoom > 0) {
    chromeNodes.push({
      kind: 'label',
      side: 'after',
      text: afterLabel,
      x: x + 28 * unit,
      y: labelTop,
      opacity: afterRoom,
    });
  }
  nodes.push({ kind: 'fill', style: { opacity: chrome }, children: chromeNodes });
  return nodes;
};
