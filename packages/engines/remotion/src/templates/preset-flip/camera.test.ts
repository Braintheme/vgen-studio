import { describe, expect, it } from 'vitest';
import { minCoverScale } from '../../core/primitives/camera.js';
import { cameraAt, PUSH_PER_SEC, type CameraInput } from './camera.js';
import { CAMERA_MOTIONS } from './manifest.js';

const base: Omit<CameraInput, 'motion' | 'time'> = {
  intensity: 1,
  total: 6,
  seed: 3,
  width: 1080,
  height: 1920,
};

describe('preset flip camera', () => {
  it('pushes in linearly like the reference', () => {
    expect(cameraAt({ ...base, motion: 'push-in', time: 0 }).scale).toBe(1);
    expect(cameraAt({ ...base, motion: 'push-in', time: 5.7 }).scale).toBeCloseTo(1 + PUSH_PER_SEC * 5.7);
  });

  it.each(CAMERA_MOTIONS)('%s keeps the frame covered and is deterministic', (motion) => {
    for (let time = 0; time <= 6; time += 0.25) {
      const camera = cameraAt({ ...base, motion, time });
      expect(cameraAt({ ...base, motion, time })).toEqual(camera);
      expect(camera.scale).toBeGreaterThanOrEqual(minCoverScale(camera, base.width, base.height) - 1e-9);
    }
  });
});
