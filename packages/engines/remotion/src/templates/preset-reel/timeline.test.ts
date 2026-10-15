import { describe, expect, it } from 'vitest';
import { reelTimeline, screenIndexAt, type ReelTimelineInput } from './timeline.js';

/** The reference cut (references/2) at 60 fps: 12.5 s clip, 8 screens, the card. */
const reference: ReelTimelineInput = {
  fps: 60,
  clipSec: 12.48,
  screens: 8,
  screenSec: 0.83,
  beforeHoldSec: 0.97,
  revealSec: 0.7,
  afterHoldSec: 0.8,
  punchInAtSec: 10.2,
  shutterBeforeSec: 0.6,
};

describe('reelTimeline', () => {
  it('lays the sections out back to back and derives the length', () => {
    const t = reelTimeline(reference);
    expect(t.clip).toEqual({ from: 0, to: 749 });
    expect(t.settings).toEqual({ from: 749, to: 749 + 8 * 50 });
    expect(t.card.from).toBe(t.settings.to);
    expect(t.totalFrames).toBe(t.card.to);
    // Within two frames of the reference cuts (748, 1148) and wipe start (1206).
    expect(Math.abs(t.settings.from - 748)).toBeLessThanOrEqual(2);
    expect(Math.abs(t.card.from - 1148)).toBeLessThanOrEqual(2);
    expect(Math.abs(t.reveal.from - 1206)).toBeLessThanOrEqual(2);
    expect(Math.abs(t.totalFrames / 60 - 21.6)).toBeLessThan(0.1);
  });

  it('punches in where asked and takes the title out with it', () => {
    const t = reelTimeline(reference);
    expect(t.punchIn).toEqual({ from: 612, duration: 12 });
    expect(t.titleExit).toBe(612);
  });

  it('drops a punch-in that would not fit in the clip', () => {
    const late = reelTimeline({ ...reference, punchInAtSec: 12.3 });
    expect(late.punchIn).toBeNull();
    expect(late.titleExit).toBeNull();
    expect(reelTimeline({ ...reference, punchInAtSec: null }).punchIn).toBeNull();
  });

  it('switches screenshots hard and clamps outside the section', () => {
    const t = reelTimeline({ ...reference, fps: 30, screenSec: 1 });
    expect(screenIndexAt(-5, t)).toBe(0);
    expect(screenIndexAt(29, t)).toBe(0);
    expect(screenIndexAt(30, t)).toBe(1);
    expect(screenIndexAt(10_000, t)).toBe(7);
  });

  it('keeps one placeholder screen when none are uploaded', () => {
    const t = reelTimeline({ ...reference, screens: 0 });
    expect(t.settings.to - t.settings.from).toBe(t.screenFrames);
  });

  it('clicks the shutter before the zoom and starts the swoosh with the wipe in the card', () => {
    const t = reelTimeline(reference);
    // The zoom starts half a seam (15 frames) before the cut at 749; the click 0.6 s earlier.
    expect(t.shutterAt).toBe(749 - 15 - 36);
    expect(reelTimeline({ ...reference, shutterBeforeSec: 1 }).shutterAt).toBe(749 - 15 - 60);
    expect(t.swooshAt).toBe(t.reveal.from - 2);
    expect(t.swooshAt).toBeGreaterThanOrEqual(t.card.from);
  });
});
