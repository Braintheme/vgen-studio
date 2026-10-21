import { describe, expect, it } from 'vitest';
import { contrastRatio, meanLuminance, readableColor, relativeLuminance } from './contrast.js';

describe('contrast', () => {
  it('follows WCAG luminance and contrast', () => {
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 5);
    expect(relativeLuminance([0, 0, 0])).toBe(0);
    expect(contrastRatio(1, 0)).toBeCloseTo(21, 5);
  });

  it('averages pixels and skips transparent ones', () => {
    const pixels = [255, 255, 255, 255, 0, 0, 0, 255, 255, 255, 255, 0];
    expect(meanLuminance(pixels)).toBeCloseTo(0.5, 5);
    expect(meanLuminance([])).toBe(0);
  });

  it('keeps the preferred colour while it reads, switches over bright areas', () => {
    expect(readableColor('#ffffff', '#111111', 0.05)).toBe('#ffffff');
    expect(readableColor('#ffffff', '#111111', 0.8)).toBe('#111111');
    // A dark preferred colour on a dark area switches to the light alternative.
    expect(readableColor('#111111', '#ffffff', 0.02)).toBe('#ffffff');
  });
});
