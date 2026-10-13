import { describe, expect, it } from 'vitest';
import { measureMotion, motionFailures, quadraticResiduals, type MotionSample } from './motion-metrics.js';

const drift = (frame: number): number => 100 + 0.2 * frame + 0.002 * frame ** 2;

describe('motion metrics', () => {
  it('a smooth eased drift has no residual', () => {
    const frames = Array.from({ length: 40 }, (_, i) => i);
    const residuals = quadraticResiduals(frames, frames.map(drift));
    expect(Math.max(...residuals.map(Math.abs))).toBeLessThan(1e-6);
  });

  it('flags pixel-grid snapping of the box and glyph wobble of the text', () => {
    const frames = Array.from({ length: 50 }, (_, i) => 72 + i);
    const smooth: MotionSample[] = frames.map((frame) => ({
      frame,
      box: drift(frame),
      text: drift(frame) + 105,
    }));
    expect(motionFailures(measureMotion(smooth))).toEqual([]);

    // Layout snapping: the box jumps whole pixels; glyphs snap on their own.
    const snapped: MotionSample[] = frames.map((frame) => ({
      frame,
      box: Math.round(drift(frame)),
      text: Math.round(drift(frame) + 105.4 + 0.6 * Math.sin(frame * 1.7)),
    }));
    expect(motionFailures(measureMotion(snapped))).toEqual(
      expect.arrayContaining([expect.stringMatching(/^boxStepPx/), expect.stringMatching(/^textStepPx/)]),
    );
  });
});
