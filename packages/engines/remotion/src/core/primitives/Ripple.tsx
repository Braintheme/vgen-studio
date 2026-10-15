import { evolvePath } from '@remotion/paths';
import { makeCircle } from '@remotion/shapes';
import type React from 'react';
import { clamp01, ease, mix } from '../motion.js';
import { placeAt } from '../placement.js';

export interface RippleProps {
  /** Centre, px. */
  readonly x: number;
  readonly y: number;
  /** 0..1 progress of the ripple (nothing outside). */
  readonly progress: number;
  /** Radius at the start and at the end, px. */
  readonly from: number;
  readonly to: number;
  readonly color: string;
  readonly strokeWidth: number;
  /** Degrees: where the stroke starts drawing. */
  readonly rotate?: number;
}

/**
 * A thin ring that draws itself around a point while it widens and fades: a "splash" where
 * something lands. The ring scales on an inner layer (no `will-change`), so it stays crisp.
 */
export const Ripple: React.FC<RippleProps> = ({
  x,
  y,
  progress,
  from,
  to,
  color,
  strokeWidth,
  rotate = -90,
}) => {
  if (progress <= 0 || progress >= 1) {
    return null;
  }
  const grow = ease.outCubic(progress);
  const radius = mix(from, to, grow);
  // Drawn at the final size and scaled down: the stroke keeps its width relative to the ring.
  const circle = makeCircle({ radius: to });
  const drawn = evolvePath(clamp01(progress / 0.45), circle.path);
  const scale = radius / to;
  return (
    <div style={{ ...placeAt(x - to, y - to), width: to * 2, height: to * 2 }}>
      <svg
        width={to * 2}
        height={to * 2}
        viewBox={`0 0 ${circle.width} ${circle.height}`}
        style={{
          display: 'block',
          overflow: 'visible',
          transform: `scale(${scale.toFixed(5)}) rotate(${rotate}deg)`,
          transformOrigin: '50% 50%',
          opacity: 1 - ease.inCubic(progress),
        }}
      >
        <path
          d={circle.path}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth / Math.max(scale, 0.05)}
          strokeLinecap="round"
          strokeDasharray={drawn.strokeDasharray}
          strokeDashoffset={drawn.strokeDashoffset}
        />
      </svg>
    </div>
  );
};
