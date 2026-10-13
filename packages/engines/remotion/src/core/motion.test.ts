import { describe, expect, it } from 'vitest';
import { cubicBezier, ease, keyframes, progress } from './motion.js';

describe('motion', () => {
  it('cubicBezier matches the CSS ease-in-out reference points', () => {
    const easeInOut = cubicBezier(0.42, 0, 0.58, 1);
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.5)).toBeCloseTo(0.5, 5);
    expect(easeInOut(0.25)).toBeCloseTo(0.1291, 3);
  });

  it('curated easings are monotonic', () => {
    for (const fn of Object.values(ease)) {
      let previous = -Infinity;
      for (let step = 0; step <= 100; step += 1) {
        const value = fn(step / 100);
        expect(value).toBeGreaterThanOrEqual(previous - 1e-9);
        previous = value;
      }
    }
  });

  it('progress and keyframes clamp to their ranges', () => {
    expect(progress(-5, 0, 10)).toBe(0);
    expect(progress(15, 0, 10)).toBe(1);
    const frames = [
      { at: 0, value: 1 },
      { at: 1, value: 0 },
    ];
    expect(keyframes(-1, frames)).toBe(1);
    expect(keyframes(2, frames)).toBe(0);
  });
});
