// Pure camera moves over the photos (no React): one continuous move from the cut to the end,
// shared by every look, so dissolves read as one shot changing colour.
import { noise2D } from '@remotion/noise';
import { coverCamera, type Camera } from '../../core/primitives/camera.js';
import type { CameraMotion } from './manifest.js';

/** Linear push of the reference: 1.00 -> 1.19 over f440-f780 (59.94 fps), ~3.3% per second. */
export const PUSH_PER_SEC = 0.033;
/** Handheld: wander (fraction of the frame), sway (degrees) and noise speed (cycles per second). */
const HANDHELD = { shift: 0.006, rotate: 0.35, speed: 0.32 } as const;
/** Drift: pan across this share of the frame over the whole section. */
const DRIFT = 0.035;

export interface CameraInput {
  readonly motion: CameraMotion;
  /** 1 = the reference's amount. */
  readonly intensity: number;
  /** Seconds since the cut, and the photos section's length. */
  readonly time: number;
  readonly total: number;
  readonly seed: number;
  /** Output frame size (cover math for rotations and pans). */
  readonly width: number;
  readonly height: number;
}

export const cameraAt = (input: CameraInput): Camera => {
  const { motion, intensity, time, total, seed } = input;
  const push = PUSH_PER_SEC * intensity;
  const handheld = (): Camera => ({
    scale: 1,
    x: noise2D(seed, 0, time * HANDHELD.speed) * HANDHELD.shift * intensity,
    y: noise2D(seed, 50, time * HANDHELD.speed) * HANDHELD.shift * intensity,
    rotate: noise2D(seed, 100, time * HANDHELD.speed * 0.8) * HANDHELD.rotate * intensity,
  });
  const cover = (camera: Camera): Camera => coverCamera(camera, input.width, input.height);

  switch (motion) {
    case 'push-in':
      return { scale: 1 + push * time, x: 0, y: 0, rotate: 0 };
    case 'pull-out':
      return { scale: 1 + push * Math.max(0, total - time), x: 0, y: 0, rotate: 0 };
    case 'handheld':
      return cover(handheld());
    case 'push-handheld': {
      const shake = handheld();
      // The push grows on top of the scale that keeps the corners covered.
      const base = cover(shake).scale;
      return { ...shake, scale: base + push * time };
    }
    case 'drift': {
      const x = DRIFT * intensity * (time / Math.max(total, 0.001) - 0.5);
      return cover({ scale: 1, x, y: 0, rotate: 0 });
    }
    case 'still':
      return { scale: 1, x: 0, y: 0, rotate: 0 };
  }
};
