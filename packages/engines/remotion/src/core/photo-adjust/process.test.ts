import { describe, expect, it } from 'vitest';
import { applyAdjustments, toneCurve } from './process.js';
import { ADJUSTMENT_KEYS, effectiveAdjustments, isNeutral, type Adjustments } from './schema.js';

const NEUTRAL = Object.fromEntries(ADJUSTMENT_KEYS.map((key) => [key, 0])) as Adjustments;
const with_ = (values: Partial<Adjustments>): Adjustments => ({ ...NEUTRAL, ...values });

/** A tiny gradient image: greys from black to white plus a few colours. */
const image = (): Uint8ClampedArray => {
  const colours = [
    [0, 0, 0],
    [40, 40, 40],
    [90, 90, 90],
    [128, 128, 128],
    [170, 170, 170],
    [215, 215, 215],
    [255, 255, 255],
    [180, 90, 60],
    [60, 120, 70],
    [70, 90, 160],
  ];
  return Uint8ClampedArray.from(colours.flatMap(([r = 0, g = 0, b = 0]) => [r, g, b, 255]));
};
const pixel = (data: Uint8ClampedArray, index: number): number[] =>
  Array.from(data.slice(index * 4, index * 4 + 3));
const run = (values: Partial<Adjustments>): Uint8ClampedArray => {
  const data = image();
  applyAdjustments(data, 10, 1, with_(values));
  return data;
};
const luma = ([r = 0, g = 0, b = 0]: number[]): number => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const chroma = ([r = 0, g = 0, b = 0]: number[]): number => Math.max(r, g, b) - Math.min(r, g, b);

describe('photo adjustments', () => {
  it('leaves the pixels alone when neutral (within rounding)', () => {
    const before = image();
    const after = run({});
    after.forEach((value, index) => {
      expect(Math.abs(value - (before[index] ?? 0))).toBeLessThanOrEqual(1);
    });
  });

  it('exposure brightens and darkens', () => {
    expect(luma(pixel(run({ exposure: 50 }), 3))).toBeGreaterThan(145);
    expect(luma(pixel(run({ exposure: -50 }), 3))).toBeLessThan(110);
  });

  it('contrast spreads or flattens the tones around the middle', () => {
    const curve = (contrast: number) => toneCurve(with_({ contrast }));
    expect(curve(50)[256] ?? 1).toBeLessThan(0.25);
    expect(curve(-50)[256] ?? 0).toBeGreaterThan(0.25);
    expect(curve(50)[512]).toBeCloseTo(0.5, 2);
    expect(curve(50)[0]).toBe(0);
    expect(curve(50)[1024]).toBe(1);
  });

  it('shadows lift the dark tones and leave the whites, highlights the other way round', () => {
    expect(luma(pixel(run({ shadows: 80 }), 1))).toBeGreaterThan(50);
    expect(pixel(run({ shadows: 80 }), 6)).toEqual([255, 255, 255]);
    expect(luma(pixel(run({ highlights: -80 }), 5))).toBeLessThan(205);
    expect(pixel(run({ highlights: -80 }), 0)).toEqual([0, 0, 0]);
  });

  it('temperature warms or cools a grey, tint moves it to magenta or green', () => {
    const [wr = 0, , wb = 0] = pixel(run({ temperature: 60 }), 3);
    expect(wr).toBeGreaterThan(wb + 10);
    const [cr = 0, , cb = 0] = pixel(run({ temperature: -60 }), 3);
    expect(cb).toBeGreaterThan(cr + 10);
    const [mr = 0, mg = 0] = pixel(run({ tint: 60 }), 3);
    expect(mr).toBeGreaterThan(mg + 5);
  });

  it('saturation and vibrance change colourfulness, not greys', () => {
    expect(chroma(pixel(run({ saturation: -100 }), 7))).toBeLessThanOrEqual(1);
    expect(chroma(pixel(run({ saturation: 50 }), 7))).toBeGreaterThan(chroma(pixel(image(), 7)));
    expect(chroma(pixel(run({ vibrance: 80 }), 8))).toBeGreaterThan(chroma(pixel(image(), 8)));
    expect(chroma(pixel(run({ saturation: 50, vibrance: 50 }), 3))).toBeLessThanOrEqual(1);
  });

  it('is deterministic', () => {
    expect(run({ clarity: 60, contrast: 20, temperature: 10 })).toEqual(
      run({ clarity: 60, contrast: 20, temperature: 10 }),
    );
  });

  it('looks add to the sliders and clamp', () => {
    const flat = effectiveAdjustments({ look: 'flat', ...NEUTRAL });
    expect(flat.contrast).toBeLessThan(0);
    expect(isNeutral(flat)).toBe(false);
    expect(effectiveAdjustments({ look: 'juicy', ...NEUTRAL, vibrance: 90 }).vibrance).toBe(100);
    expect(isNeutral(effectiveAdjustments({ look: 'none', ...NEUTRAL }))).toBe(true);
  });
});
