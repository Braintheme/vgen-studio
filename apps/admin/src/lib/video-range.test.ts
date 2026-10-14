import { describe, expect, it } from 'vitest';
import { clampVideoRange, initialVideoRange } from './video-range';

const limits = { durationSec: 40, minSec: 3, maxSec: 30 };

describe('clampVideoRange', () => {
  it('keeps a valid fragment and rounds to 0.1 s', () => {
    expect(clampVideoRange({ startSec: 2.04, endSec: 14.96 }, limits)).toEqual({ startSec: 2, endSec: 15 });
  });

  it('keeps the fragment inside the video', () => {
    expect(clampVideoRange({ startSec: 38, endSec: 45 }, limits)).toEqual({ startSec: 37, endSec: 40 });
    expect(clampVideoRange({ startSec: -2, endSec: 5 }, limits)).toEqual({ startSec: 0, endSec: 5 });
  });

  it('moves the other handle to respect the length limits', () => {
    const previous = { startSec: 5, endSec: 15 };
    // Start dragged far left: the end follows to stay within 30 s.
    expect(clampVideoRange({ startSec: 0, endSec: 40 }, limits)).toEqual({ startSec: 0, endSec: 30 });
    // End dragged past the maximum: the start follows.
    expect(clampVideoRange({ startSec: 5, endSec: 39 }, limits, previous)).toEqual({
      startSec: 9,
      endSec: 39,
    });
    // End dragged below the minimum: the start follows, down to 0.
    expect(clampVideoRange({ startSec: 5, endSec: 6 }, limits, previous)).toEqual({ startSec: 3, endSec: 6 });
    expect(clampVideoRange({ startSec: 5, endSec: 1 }, limits, previous)).toEqual({ startSec: 0, endSec: 3 });
    // Start dragged past the end: the end follows.
    expect(clampVideoRange({ startSec: 14, endSec: 15 }, limits, previous)).toEqual({
      startSec: 14,
      endSec: 17,
    });
  });

  it('uses a video shorter than the minimum whole', () => {
    expect(clampVideoRange({ startSec: 1, endSec: 2 }, { ...limits, durationSec: 2.5 })).toEqual({
      startSec: 0,
      endSec: 2.5,
    });
  });
});

describe('initialVideoRange', () => {
  it('starts at 0 with the preferred length when it fits', () => {
    expect(initialVideoRange(limits, 12)).toEqual({ startSec: 0, endSec: 12 });
    expect(initialVideoRange({ ...limits, durationSec: 8 }, 12)).toEqual({ startSec: 0, endSec: 8 });
  });
});
