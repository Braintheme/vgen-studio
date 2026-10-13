import type React from 'react';
import { clamp01, ease } from '../motion.js';
import { placeAt, type PlacementAnchor } from '../placement.js';

export interface LabelProps {
  readonly text: string;
  /** Position in px of the label's top edge and of its `align` edge. */
  readonly x: number;
  readonly y: number;
  /** `end`: `x` is the right edge (labels left of a divider). */
  readonly align?: PlacementAnchor;
  /** 0..1 appear progress (linear; eased internally). */
  readonly enter: number;
  /** 0..1 disappear progress. */
  readonly exit?: number;
  /** Extra fade (e.g. when the label runs out of room). */
  readonly opacity?: number;
  readonly unit: number;
  readonly fontFamily: string;
  readonly accent: string;
  readonly textColor: string;
  readonly radius: number;
}

/**
 * Glassy pill label ("BEFORE" / "AFTER") with a masked slide-in. Moves by transforms only
 * (see core/placement.ts), so slow drifts stay smooth in renders, not only in the preview.
 */
export const Label: React.FC<LabelProps> = ({
  text,
  x,
  y,
  align = 'start',
  enter,
  exit = 0,
  opacity = 1,
  unit,
  fontFamily,
  accent,
  textColor,
  radius,
}) => {
  const shown = ease.outExpo(clamp01(enter));
  const hidden = ease.inOutCubic(clamp01(exit));
  if (shown <= 0 || hidden >= 1 || opacity <= 0) {
    return null;
  }
  const reveal = shown * (1 - hidden);
  const slide = ((1 - shown) * -24 + hidden * 16) * unit;
  const corner = Math.min(radius, 60) * unit;
  return (
    <div
      style={{
        ...placeAt(x + slide, y, { anchor: align }),
        display: 'flex',
        alignItems: 'center',
        gap: 16 * unit,
        padding: `${18 * unit}px ${32 * unit}px`,
        borderRadius: corner,
        background: 'rgba(12,12,16,0.42)',
        border: `${1.5 * unit}px solid rgba(255,255,255,0.22)`,
        backdropFilter: `blur(${18 * unit}px)`,
        color: textColor,
        fontFamily,
        fontWeight: 600,
        fontSize: 34 * unit,
        // Constant: animating letter-spacing re-lays out and re-snaps the text every frame.
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        clipPath: `inset(0 ${((1 - reveal) * 100).toFixed(2)}% 0 0 round ${corner}px)`,
        opacity: (1 - hidden) * opacity,
      }}
    >
      <span
        style={{
          width: 12 * unit,
          height: 12 * unit,
          borderRadius: '50%',
          background: accent,
          boxShadow: `0 0 ${16 * unit}px ${accent}`,
          flexShrink: 0,
        }}
      />
      {text}
    </div>
  );
};
