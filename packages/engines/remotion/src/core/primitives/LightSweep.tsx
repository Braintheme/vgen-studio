import type React from 'react';
import { AbsoluteFill } from 'remotion';
import { bell, clamp01, mix } from '../motion.js';

export interface LightSweepProps {
  /** 0..1 travel of the light band across the frame. */
  readonly progress: number;
  readonly angle?: number;
  readonly color?: string;
  readonly intensity?: number;
  /** Band width in % of the gradient line. */
  readonly width?: number;
}

/** A soft band of light passing across the frame (glossy "shine" pass). */
export const LightSweep: React.FC<LightSweepProps> = ({
  progress,
  angle = 112,
  color = '255,244,226',
  intensity = 0.55,
  width = 14,
}) => {
  if (progress <= 0 || progress >= 1) {
    return null;
  }
  const t = clamp01(progress);
  const center = mix(-width, 100 + width, t);
  const alpha = (intensity * bell(t)).toFixed(3);
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        mixBlendMode: 'screen',
        background: `linear-gradient(${angle}deg, rgba(${color},0) ${center - width}%, rgba(${color},${alpha}) ${center}%, rgba(${color},0) ${center + width * 0.6}%)`,
      }}
    />
  );
};
