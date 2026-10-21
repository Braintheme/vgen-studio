import type { MediaInfo } from '@vgen/shared';
import { describe, expect, it } from 'vitest';
import { cropShare, labelBox, placePhoto, slideCells } from './layout.js';
import { carouselCells, checkCarouselMedia } from './prepare.js';

const info = (width: number, height: number, index: number): MediaInfo => ({
  assetId: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
  kind: 'image',
  mime: 'image/jpeg',
  width,
  height,
  durationSec: null,
});

describe('slideCells', () => {
  it('cuts 3:4 into two 3:2 halves, one above the other', () => {
    const cells = slideCells({ width: 1080, height: 1440 }, 0, 'top-bottom');
    expect(cells.first).toEqual({ x: 0, y: 0, width: 1080, height: 720 });
    expect(cells.second).toEqual({ x: 0, y: 720, width: 1080, height: 720 });
    expect(cells.seam).toEqual({ x: 540, y: 720 });
  });

  it('cuts side by side, with the seam in the middle of the frame', () => {
    const cells = slideCells({ width: 1080, height: 1440 }, 0, 'left-right');
    expect(cells.first).toEqual({ x: 0, y: 0, width: 540, height: 1440 });
    expect(cells.second).toEqual({ x: 540, y: 0, width: 540, height: 1440 });
    expect(cells.seam).toEqual({ x: 540, y: 720 });
  });

  it('gives an odd remainder to the gap, so both halves match', () => {
    const rows = slideCells({ width: 1080, height: 1350 }, 5, 'top-bottom');
    expect(rows.first.height).toBe(rows.second.height);
    expect(rows.second.y - rows.first.height).toBe(6);
    expect(rows.seam.y).toBe(675);
    const columns = slideCells({ width: 1080, height: 1350 }, 7, 'left-right');
    expect(columns.first.width).toBe(columns.second.width);
    expect(columns.second.x - columns.first.width).toBe(8);
    expect(columns.seam.x).toBe(540);
  });

  it('scales the gap with the frame (1080 px design units)', () => {
    expect(carouselCells({ width: 1920, height: 1080 }, 10, 'top-bottom').first.height).toBe(535);
  });
});

describe('placePhoto', () => {
  const cell = { width: 1080, height: 720 };

  it('fills a matching cell exactly', () => {
    expect(placePhoto({ width: 3000, height: 2000 }, cell, 'fill', 'center')).toEqual({
      x: 0,
      y: 0,
      width: 1080,
      height: 720,
    });
  });

  it('crops a portrait by the anchor', () => {
    const portrait = { width: 2000, height: 3000 };
    expect(placePhoto(portrait, cell, 'fill', 'top')).toEqual({ x: 0, y: 0, width: 1080, height: 1620 });
    expect(placePhoto(portrait, cell, 'fill', 'center').y).toBe(-450);
    expect(placePhoto(portrait, cell, 'fill', 'bottom').y).toBe(-900);
  });

  it('holds a horizontal overflow by the same anchor (top = left, bottom = right)', () => {
    const tall = { width: 540, height: 1440 };
    const portrait = { width: 2000, height: 3000 };
    expect(placePhoto(portrait, tall, 'fill', 'top')).toEqual({ x: 0, y: 0, width: 960, height: 1440 });
    expect(placePhoto(portrait, tall, 'fill', 'center').x).toBe(-210);
    expect(placePhoto(portrait, tall, 'fill', 'bottom').x).toBe(-420);
  });

  it('fits a portrait whole, centred', () => {
    expect(placePhoto({ width: 2000, height: 3000 }, cell, 'fit', 'top')).toEqual({
      x: 300,
      y: 0,
      width: 480,
      height: 720,
    });
  });

  it('never leaves a pixel uncovered when filling', () => {
    const rect = placePhoto({ width: 1999, height: 1333 }, cell, 'fill', 'center');
    expect(rect.width).toBeGreaterThanOrEqual(1080);
    expect(rect.height).toBeGreaterThanOrEqual(720);
  });

  it('measures how much a fill crops', () => {
    expect(cropShare({ width: 3000, height: 2000 }, cell)).toBe(0);
    expect(cropShare({ width: 2000, height: 3000 }, cell)).toBeCloseTo(0.556, 3);
  });
});

describe('checkCarouselMedia', () => {
  it('accepts matching pairs', () => {
    expect(checkCarouselMedia({ photos: [info(3000, 2000, 1), info(3000, 2000, 2)] })).toEqual([]);
  });

  it('flags an unpaired photo, mismatched pairs and small photos', () => {
    const warnings = checkCarouselMedia({
      photos: [info(3000, 2000, 1), info(2000, 3000, 2), info(800, 600, 3), info(800, 600, 4), info(1, 1, 5)],
    });
    expect(warnings.map((warning) => warning.code)).toEqual([
      'UNPAIRED_PHOTO',
      'ASPECT_MISMATCH',
      'LOW_RESOLUTION',
    ]);
    expect(warnings[1]?.message).toMatch(/^Slide 1:/);
    expect(warnings[2]?.message).toMatch(/^Slide 2:/);
  });
});

describe('labelBox', () => {
  const cell = { width: 1080, height: 720 };
  const label = { text: 'YES', size: 100, lineHeight: 1, letterSpacing: 0 };
  const placement = { gap: 10, offset: 40 };

  it('places one text at the top, centre or bottom of the half', () => {
    expect(labelBox(cell, [label], { ...placement, position: 'bottom' })).toEqual({
      x: 447,
      y: 580,
      width: 186,
      height: 100,
    });
    expect(labelBox(cell, [label], { ...placement, position: 'top' }).y).toBe(40);
    expect(labelBox(cell, [label], { ...placement, position: 'center' }).y).toBe(310);
  });

  it('stacks a caption under the label with the gap, as wide as the wider text', () => {
    const caption = { text: 'Edited with my preset', size: 30, lineHeight: 1.2, letterSpacing: 0 };
    const box = labelBox(cell, [label, caption], { ...placement, position: 'bottom' });
    expect(box.height).toBe(146);
    expect(box.y).toBe(534);
    expect(box.width).toBe(391);
  });

  it('grows with lines and stays inside the half', () => {
    const long = { text: 'A VERY LONG LABEL\nTWO', size: 200, lineHeight: 1, letterSpacing: 0 };
    const box = labelBox(cell, [long], { ...placement, position: 'bottom' });
    expect(box.height).toBe(400);
    expect(box.width).toBe(1080);
    expect(box.y).toBe(280);
  });
});
