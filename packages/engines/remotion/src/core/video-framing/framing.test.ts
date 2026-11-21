import { describe, expect, it } from 'vitest';
import { framingOffset, isSideways, videoFramingField } from './framing.js';

const FRAME = { width: 1080, height: 1920 };
const LANDSCAPE = { width: 1920, height: 1080 };

describe('video framing', () => {
  it('defaults to no rotation, and old values without one stay valid', () => {
    expect(videoFramingField().parse(undefined)).toEqual({ rotate: 0, tilt: 0, zoom: 1, x: 0, y: 0 });
    expect(videoFramingField().parse({ zoom: 2, x: 0.5, y: 0 }).rotate).toBe(0);
    expect(videoFramingField().safeParse({ rotate: 45 }).success).toBe(false);
  });

  it('a landscape clip turned a quarter fills a vertical frame exactly, with no crop', () => {
    for (const rotate of [90, 270] as const) {
      expect(framingOffset(LANDSCAPE, FRAME, { rotate, zoom: 1, x: 0, y: 0 })).toMatchObject({
        width: 1080,
        height: 1920,
      });
    }
  });

  it('half turns keep the proportions and the cover fit of the unrotated clip', () => {
    const plain = framingOffset(LANDSCAPE, FRAME, { zoom: 1, x: 0, y: 0 });
    expect(framingOffset(LANDSCAPE, FRAME, { rotate: 180, zoom: 1, x: 0, y: 0 })).toEqual(plain);
    expect(plain.height).toBe(1920);
    expect(plain.width).toBeCloseTo(3413.33, 1);
    expect(isSideways(180)).toBe(false);
    expect(isSideways(90)).toBe(true);
  });

  it('pans within what the zoom and the rotation leave outside the frame', () => {
    expect(framingOffset(LANDSCAPE, FRAME, { rotate: 90, zoom: 1, x: 1, y: 1 })).toMatchObject({
      x: -0,
      y: -0,
    });
    expect(framingOffset(LANDSCAPE, FRAME, { rotate: 90, zoom: 2, x: 1, y: -1 })).toMatchObject({
      x: -540,
      y: 960,
    });
  });
});

/** Whether every corner of the frame lies inside the clip placed by `framingOffset` (screen px). */
const coversFrame = (
  fit: ReturnType<typeof framingOffset>,
  frame: { width: number; height: number },
): boolean => {
  const angle = (fit.tilt * Math.PI) / 180;
  const halfW = (fit.width * fit.scale) / 2;
  const halfH = (fit.height * fit.scale) / 2;
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].every(([sx = 0, sy = 0]) => {
    // A frame corner relative to the clip's centre, in the clip's (tilted) axes.
    const dx = (sx * frame.width) / 2 - fit.x;
    const dy = (sy * frame.height) / 2 - fit.y;
    const u = dx * Math.cos(angle) + dy * Math.sin(angle);
    const v = -dx * Math.sin(angle) + dy * Math.cos(angle);
    return Math.abs(u) <= halfW + 1e-6 && Math.abs(v) <= halfH + 1e-6;
  });
};

describe('straighten (tilt)', () => {
  it('takes -45..45 degrees', () => {
    expect(videoFramingField().parse({ tilt: -3.5 }).tilt).toBe(-3.5);
    expect(videoFramingField().safeParse({ tilt: 46 }).success).toBe(false);
  });

  it('changes nothing at 0', () => {
    const fit = framingOffset(LANDSCAPE, FRAME, { zoom: 1.6, x: 0.4, y: -0.3 });
    expect(fit).toMatchObject({ tilt: 0, scale: 1.6 });
    expect(fit.x).toBeCloseTo(-0.4 * ((fit.width * 1.6 - 1080) / 2), 9);
  });

  it('grows the clip just enough to hide the corners', () => {
    for (const size of [LANDSCAPE, FRAME, { width: 1080, height: 1080 }]) {
      for (const tilt of [-12, -3, 0.5, 7, 45]) {
        const fit = framingOffset(size, FRAME, { tilt, zoom: 1, x: 0, y: 0 });
        expect(coversFrame(fit, FRAME)).toBe(true);
        expect(coversFrame({ ...fit, scale: fit.scale * 0.99 }, FRAME)).toBe(false);
      }
    }
  });

  it('never pans a corner into view, even at the limits', () => {
    for (const tilt of [-8, 4, 20]) {
      for (const [x, y] of [
        [1, 1],
        [-1, 1],
        [1, -1],
        [-1, -1],
      ] as const) {
        for (const zoom of [1, 1.4]) {
          const fit = framingOffset(LANDSCAPE, FRAME, { rotate: 90, tilt, zoom, x, y });
          expect(coversFrame(fit, FRAME)).toBe(true);
        }
      }
    }
  });
});
