import { describe, expect, it } from 'vitest';
import { gradeTimeline } from './timeline.js';

describe('palette grade timeline', () => {
  it('matches the reference at its own length, 7 s (±2 frames)', () => {
    const t = gradeTimeline({ durationSec: 7, fps: 30 });
    // Reference frames: breakdown.md and the easing fits on its measured camera scale.
    const pairs: [number, number][] = [
      [t.pushIn.from, 18],
      [Math.round(t.wedgeAt(0)), 21],
      [Math.round(t.wedgeAt(7)), 32],
      [t.desaturate.from, 40],
      [t.pullBack.from, 56],
      [t.collapse.from, 57],
      [t.collapse.from + t.collapse.duration, 69],
      [t.burst.from, 86],
      [t.darken.from, 97],
      [t.darken.from + t.darken.duration, 116],
      [t.color.from, 122],
      [t.label.from, 124],
      [t.label.from + t.label.duration, 135],
      [t.end, 140],
    ];
    for (const [actual, reference] of pairs) expect(Math.abs(actual - reference)).toBeLessThanOrEqual(2);
    expect(t.totalFrames).toBe(210);
  });

  it.each([6, 7, 9, 12])('keeps every phase in order and inside the video at %i s', (durationSec) => {
    for (const fps of [30, 60]) {
      const t = gradeTimeline({ durationSec, fps });
      expect(t.start).toBeGreaterThanOrEqual(Math.round(0.3 * fps));
      expect(t.pushIn.from + t.pushIn.duration).toBeLessThanOrEqual(t.pullBack.from);
      expect(t.wedgeAt(7)).toBeLessThan(t.collapse.from);
      expect(t.collapse.from + t.collapse.duration).toBeLessThanOrEqual(t.solidAt);
      expect(t.solidAt).toBeLessThan(t.burst.from);
      expect(t.darken.from + t.darken.duration).toBeLessThanOrEqual(t.color.from);
      expect(t.label.from + t.label.duration).toBeLessThanOrEqual(t.end);
      // The graded photo holds for a while at the end.
      expect(t.totalFrames - t.end).toBeGreaterThanOrEqual(Math.round(0.8 * fps));
    }
  });

  it('holds the before photo as long as asked and gives the rest to the final hold', () => {
    const t = gradeTimeline({ durationSec: 10, fps: 30, introHoldSec: 2 });
    expect(t.start).toBe(60);
    expect(t.end - t.start).toBe(122);
    // A hold longer than the video allows is cut so the after photo still holds.
    const tight = gradeTimeline({ durationSec: 6, fps: 30, introHoldSec: 3 });
    expect(tight.totalFrames - tight.end).toBeGreaterThanOrEqual(24);
  });

  it('runs the process faster or slower, and speeds a slow one up to fit', () => {
    const fast = gradeTimeline({ durationSec: 7, fps: 30, speed: 1.5 });
    expect(fast.end - fast.start).toBe(Math.round(122 / 1.5));
    expect(fast.burst.from - fast.start).toBe(Math.round(68 / 1.5));
    const slow = gradeTimeline({ durationSec: 12, fps: 30, speed: 0.7 });
    expect(slow.speed).toBe(0.7);
    expect(slow.end - slow.start).toBe(Math.round(122 / 0.7));
    const squeezed = gradeTimeline({ durationSec: 6, fps: 30, speed: 0.7 });
    expect(squeezed.speed).toBeGreaterThan(0.7);
    expect(squeezed.start).toBeGreaterThanOrEqual(9);
    expect(squeezed.totalFrames - squeezed.end).toBeGreaterThanOrEqual(23);
  });

  it('gives extra length mostly to the final hold', () => {
    const short = gradeTimeline({ durationSec: 7, fps: 30 });
    const long = gradeTimeline({ durationSec: 12, fps: 30 });
    const outro = (t: typeof short) => t.totalFrames - t.end;
    expect(outro(long) - outro(short)).toBeGreaterThan(long.start - short.start);
  });
});
