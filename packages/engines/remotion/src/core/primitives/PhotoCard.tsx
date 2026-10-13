import type React from 'react';
import { AbsoluteFill } from 'remotion';
import { clamp01, mix } from '../motion.js';

export interface CardShadow {
  /** Offsets and blur as fractions of the frame width. */
  readonly x: number;
  readonly y: number;
  readonly blur: number;
  readonly opacity: number;
}

export interface PhotoCardProps {
  /** 0 = the content fills the frame, 1 = a floating card. */
  readonly progress: number;
  /** Card size relative to the frame at progress 1. */
  readonly scale: number;
  /** Rotation around the vertical / horizontal axis at the current moment, degrees. */
  readonly rotateY: number;
  readonly rotateX?: number;
  /** Corner radius of the card as seen on screen, px. */
  readonly radius: number;
  readonly shadow: CardShadow;
  /** Frame width, px (shadow geometry is relative to it). */
  readonly frameWidth: number;
  /** Camera distance as a multiple of the frame width; smaller = stronger perspective. */
  readonly perspective?: number;
  /** Extra scale applied to the content inside the card (e.g. a settle zoom). */
  readonly contentScale?: number;
  readonly children: React.ReactNode;
}

const DEFAULT_PERSPECTIVE = 2.2;

/**
 * The whole frame as a card in 3D: at progress 0 it is the full-bleed frame, at 1 a scaled,
 * tilted card with rounded corners and a drop shadow from a fixed light (the shadow does not
 * turn with the card). Transforms only, so it moves smoothly in renders.
 */
export const PhotoCard: React.FC<PhotoCardProps> = ({
  progress,
  scale,
  rotateY,
  rotateX = 0,
  radius,
  shadow,
  frameWidth,
  perspective = DEFAULT_PERSPECTIVE,
  contentScale = 1,
  children,
}) => {
  const p = clamp01(progress);
  const size = mix(1, scale, p);
  // The card is the frame scaled down: compensate the radius for the scale.
  const innerRadius = (radius * p) / Math.max(size, 1e-3);
  const px = (fraction: number): string => `${(fraction * frameWidth * p).toFixed(2)}px`;
  const shadowFilter =
    p > 0
      ? `drop-shadow(${px(shadow.x)} ${px(shadow.y)} ${px(shadow.blur)} rgba(0,0,0,${(shadow.opacity * p).toFixed(3)}))`
      : 'none';
  return (
    <AbsoluteFill style={{ filter: shadowFilter }}>
      <AbsoluteFill style={{ perspective: `${(perspective * frameWidth).toFixed(0)}px` }}>
        <AbsoluteFill
          style={{
            transform: `scale(${size.toFixed(5)}) rotateY(${rotateY.toFixed(3)}deg) rotateX(${rotateX.toFixed(3)}deg)`,
            borderRadius: innerRadius,
            overflow: 'hidden',
            // No `will-change: transform`: Chrome would freeze the raster scale of this
            // scaling layer, and frames rendered in different tabs would differ (blur/jumps).
          }}
        >
          <AbsoluteFill style={{ transform: `scale(${contentScale.toFixed(5)})` }}>{children}</AbsoluteFill>
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
