import { describe, expect, it } from 'vitest';
import { beforeAfterPosterFrame, computeBeforeAfterTimeline, SEGMENT_IDS } from './timeline.js';

const seconds = (frames: number, fps = 30) => frames / fps;

describe('before-after timeline', () => {
  it('matches the 13 s reference cut', () => {
    const timeline = computeBeforeAfterTimeline({ durationSec: 13, fps: 30 });
    const durations = SEGMENT_IDS.map((id) => seconds(timeline.segments[id].durationInFrames));
    expect(durations.map((value) => Math.round(value * 10) / 10)).toEqual([1.5, 2.8, 2, 3.7, 1, 2]);
    expect(timeline.segments.reveal.from).toBe(128); // ~4.3 s
    expect(timeline.segments.after.from).toBe(188); // ~6.3 s
    expect(timeline.seamFrames).toBe(15);
  });

  it('sequence lengths minus seam overlaps equal the total duration', () => {
    for (const fps of [30, 60]) {
      for (let durationSec = 8; durationSec <= 30; durationSec += 0.5) {
        const t = computeBeforeAfterTimeline({ durationSec, fps });
        const { intro, body, outro } = t.sequences;
        expect(intro + body + outro - 2 * t.seamFrames).toBe(t.totalFrames);
        // The body starts exactly where the intro segment ends.
        expect(t.segments.intro.durationInFrames).toBe(t.segments.before.from);
        expect(t.body.finale.from + t.body.finale.durationInFrames + t.seamFrames).toBe(body);
      }
    }
  });

  it('keeps intro and outro readable on short videos', () => {
    const t = computeBeforeAfterTimeline({ durationSec: 8, fps: 30 });
    expect(seconds(t.segments.intro.durationInFrames)).toBeGreaterThanOrEqual(1.2);
    expect(seconds(t.segments.outro.durationInFrames)).toBeGreaterThanOrEqual(1.8);
    expect(t.totalFrames).toBe(240);
  });

  it('scales scenes proportionally on long videos', () => {
    const t = computeBeforeAfterTimeline({ durationSec: 26, fps: 30 });
    expect(seconds(t.segments.after.durationInFrames)).toBe(7.5);
    expect(seconds(t.segments.reveal.durationInFrames)).toBe(4);
  });

  it('puts the poster frame in the middle of the after scene', () => {
    expect(beforeAfterPosterFrame({ durationSec: 13, fps: 30 })).toBe(244);
    // Thumbnails must sell the result: the poster frame is always inside AFTER.
    for (const fps of [30, 60]) {
      for (let durationSec = 8; durationSec <= 30; durationSec += 0.5) {
        const { after } = computeBeforeAfterTimeline({ durationSec, fps }).segments;
        const poster = beforeAfterPosterFrame({ durationSec, fps });
        expect(poster).toBeGreaterThan(after.from);
        expect(poster).toBeLessThan(after.from + after.durationInFrames);
      }
    }
  });
});
