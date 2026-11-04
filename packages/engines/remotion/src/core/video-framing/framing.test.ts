import { describe, expect, it } from 'vitest';
import { framingOffset, isSideways, videoFramingField } from './framing.js';

const FRAME = { width: 1080, height: 1920 };
const LANDSCAPE = { width: 1920, height: 1080 };

describe('video framing', () => {
  it('defaults to no rotation, and old values without one stay valid', () => {
    expect(videoFramingField().parse(undefined)).toEqual({ rotate: 0, zoom: 1, x: 0, y: 0 });
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
