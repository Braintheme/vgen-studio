import type React from 'react';
import { placeAt } from '../placement.js';

export interface WheelWedge {
  readonly fill: string;
  /** 0 hides the wedge. */
  readonly opacity: number;
}

export interface PaletteWheelProps {
  /** Wedges clockwise from `startAngle`, equal angles. */
  readonly wedges: readonly WheelWedge[];
  /** Centre, px. */
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  /** Uniform scale around the centre (e.g. collapsing into a dot). */
  readonly scale?: number;
  /** Degrees, clockwise. */
  readonly rotate?: number;
  /** Where the first wedge starts, degrees clockwise from 12 o'clock. */
  readonly startAngle?: number;
}

const point = (angle: number, radius: number): string => {
  const radians = ((angle - 90) * Math.PI) / 180;
  return `${(radius + radius * Math.cos(radians)).toFixed(3)} ${(radius + radius * Math.sin(radians)).toFixed(3)}`;
};

/**
 * A flat colour pie ("palette wheel"). Placed with transforms only; the scale/rotation sits on
 * an inner layer without `will-change`, so Chrome re-rasterizes the vector at every size.
 */
export const PaletteWheel: React.FC<PaletteWheelProps> = ({
  wedges,
  x,
  y,
  radius,
  scale = 1,
  rotate = 0,
  startAngle = 0,
}) => {
  if (scale <= 0 || wedges.every((wedge) => wedge.opacity <= 0)) {
    return null;
  }
  const step = 360 / Math.max(1, wedges.length);
  const size = radius * 2;
  return (
    <div style={{ ...placeAt(x - radius, y - radius), width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{
          display: 'block',
          overflow: 'visible',
          transform: `scale(${scale.toFixed(5)}) rotate(${rotate.toFixed(3)}deg)`,
          transformOrigin: '50% 50%',
        }}
      >
        {wedges.map((wedge, index) =>
          wedge.opacity > 0 ? (
            <path
              // Wedges are positional: the index is their identity.
              key={index}
              d={`M ${radius} ${radius} L ${point(startAngle + index * step, radius)} A ${radius} ${radius} 0 0 1 ${point(startAngle + (index + 1) * step, radius)} Z`}
              fill={wedge.fill}
              fillOpacity={Math.min(1, wedge.opacity)}
              // Hairline overlap hides the anti-aliased seams between wedges.
              stroke={wedge.fill}
              strokeOpacity={Math.min(1, wedge.opacity)}
              strokeWidth={0.75}
              strokeLinejoin="round"
            />
          ) : null,
        )}
      </svg>
    </div>
  );
};
