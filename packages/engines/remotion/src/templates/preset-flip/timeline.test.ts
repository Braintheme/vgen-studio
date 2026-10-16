import { describe, expect, it } from 'vitest';
import { REVEAL_EFFECTS } from '../../core/reveals/registry.js';
import { DEFAULTS, flipTimeline, labelIndexAt, photoStateAt, type FlipTimelineInput } from './timeline.js';

const CROSSFADE = REVEAL_EFFECTS.get('crossfade');

const input = (overrides: Partial<FlipTimelineInput> = {}): FlipTimelineInput => ({
  fps: 60,
  clipSec: DEFAULTS.clipSec,
  presets: 4,
  beforeHoldSec: DEFAULTS.beforeHoldSec,
  presetSec: DEFAULTS.presetSec,
  ctaHoldSec: DEFAULTS.ctaHoldSec,
  changeSec: CROSSFADE.durationSec,
  revealedAt: CROSSFADE.revealedAt,
  shutterBeforeSec: DEFAULTS.shutterBeforeSec,
  ...overrides,
});

describe('preset flip timeline', () => {
  it('matches the reference cut with 4 presets (±2 frames)', () => {
    const t = flipTimeline(input());
    // Reference frames (59.94 fps): breakdown.md.
    const pairs: [number, number][] = [
      [t.cut - Math.round(t.seamFrames / 2), 390],
      [t.cut, 412],
      [t.labelAt[0] ?? -1, 477],
      [t.labelAt[1] ?? -1, 526],
      [t.labelAt[2] ?? -1, 580],
      [t.labelAt[3] ?? -1, 632],
      [t.changes[1]?.from ?? -1, 518],
      [t.changes[2]?.from ?? -1, 570],
      [t.changes[3]?.from ?? -1, 622],
      [t.ctaAt, 685],
      [t.totalFrames, 786],
    ];
    for (const [actual, reference] of pairs) expect(Math.abs(actual - reference)).toBeLessThanOrEqual(2);
  });

  it('grows with the number of presets', () => {
    const four = flipTimeline(input());
    const ten = flipTimeline(input({ presets: 10 }));
    expect(ten.totalFrames - four.totalFrames).toBe(6 * Math.round(DEFAULTS.presetSec * 60));
    expect(ten.labelAt).toHaveLength(10);
    expect(flipTimeline(input({ presets: 0 })).labelAt).toHaveLength(1);
  });

  it('never lets a change outlast a look or start before the photo lands', () => {
    // A slow effect squeezed into short holds.
    const t = flipTimeline(input({ changeSec: 2, presetSec: 0.5, beforeHoldSec: 0.4 }));
    const landed = t.cut + Math.round(t.seamFrames / 2);
    t.changes.forEach((change, index) => {
      expect(change.from).toBeGreaterThanOrEqual(index === 0 ? landed : (t.labelAt[index - 1] ?? 0));
      expect(change.from + change.duration).toBeLessThanOrEqual(t.holdEnd(index) + change.duration);
      expect(change.duration).toBeLessThanOrEqual(Math.round(0.5 * 60));
    });
  });

  it('tells which photo and which label are on screen', () => {
    const t = flipTimeline(input());
    expect(photoStateAt(t.cut, t)).toEqual({ from: -1, to: null, progress: 0 });
    const second = t.changes[1];
    expect(second).toBeDefined();
    if (!second) return;
    expect(photoStateAt(second.from, t)).toMatchObject({ from: 0, to: 1, progress: 0 });
    expect(photoStateAt(second.from + second.duration, t)).toEqual({ from: 1, to: null, progress: 0 });
    expect(photoStateAt(t.totalFrames - 1, t)).toEqual({ from: 3, to: null, progress: 0 });

    expect(labelIndexAt((t.labelAt[0] ?? 0) - 1, t)).toBeNull();
    expect(labelIndexAt(t.labelAt[0] ?? 0, t)).toBe(0);
    expect(labelIndexAt((t.labelAt[3] ?? 0) + 1, t)).toBe(3);
    expect(labelIndexAt(t.ctaAt, t)).toBeNull();
  });

  it('clicks the shutter just before the zoom', () => {
    const t = flipTimeline(input());
    expect(t.shutterAt).toBe(t.cut - Math.round(t.seamFrames / 2) - 6);
  });
});
