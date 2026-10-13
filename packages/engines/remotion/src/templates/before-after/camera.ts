import { coverCamera, type Camera } from '../../core/primitives/camera.js';
import { ease, progress } from '../../core/motion.js';
import type { BeforeAfterTimeline } from './timeline.js';

const AMPLITUDE = { subtle: 0.55, balanced: 1, dynamic: 1.6 } as const;
export type MotionLevel = keyof typeof AMPLITUDE;

/**
 * One continuous camera for the whole body, shared by the before and after layers
 * so they stay pixel-aligned during reveals. Phase A (before + reveal) pushes in
 * and drifts left; phase B (after + finale) drifts back the other way and eases out.
 */
export const showcaseCamera = (
  frame: number,
  timeline: BeforeAfterTimeline,
  motion: MotionLevel,
  width: number,
  height: number,
): Camera => {
  const amplitude = AMPLITUDE[motion];
  const { after } = timeline.body;
  const phaseA = progress(frame, 0, after.from, ease.inOutSine);
  const phaseB = progress(frame, after.from, timeline.sequences.body - after.from, ease.inOutSine);
  return coverCamera(
    {
      scale: 1.06 + (0.07 * phaseA - 0.035 * phaseB) * amplitude,
      x: (0.016 - 0.03 * phaseA + 0.036 * phaseB) * amplitude,
      y: (0.008 - 0.014 * phaseA + 0.01 * phaseB) * amplitude,
      rotate: (-0.25 * phaseA + 0.4 * phaseB) * amplitude,
    },
    width,
    height,
  );
};
