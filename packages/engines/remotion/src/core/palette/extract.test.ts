import { describe, expect, it } from 'vitest';
import { hexToRgb } from '../color.js';
import {
  ACCENT_MIN_CHROMA,
  darkestColor,
  extractPalette,
  FALLBACK_PALETTE,
  paletteWedges,
} from './extract.js';

/** RGBA pixels: `count` pixels of each colour (with a little noise, like a real photo). */
const pixels = (parts: readonly (readonly [string, number])[]): number[] =>
  parts.flatMap(([hex, count]) => {
    const [r, g, b] = hexToRgb(hex);
    return Array.from({ length: count }, (_, index) => {
      const noise = (index % 5) - 2;
      return [r + noise, g + noise, b + noise, 255];
    }).flat();
  });

/** A graded photo like the reference's after: near-black background, greys, a red accent. */
const GRADED = pixels([
  ['#11161a', 4500],
  ['#1c2628', 1500],
  ['#8a8890', 2500],
  ['#9a2a1c', 900],
]);

describe('extractPalette', () => {
  it('finds the main colours with their weights, heaviest first', () => {
    const palette = extractPalette(GRADED);
    expect(palette.swatches[0]?.hex).toMatch(/^#1[01]1[56]1[9ab]$/);
    expect(palette.swatches[0]?.weight).toBeCloseTo(4500 / 9400, 1);
    expect(palette.swatches.length).toBeGreaterThanOrEqual(4);
  });

  it('picks the colourful minority as the accent', () => {
    const { accent } = extractPalette(GRADED);
    const [r, g, b] = hexToRgb(accent.hex);
    expect(r).toBeGreaterThan(g + 80);
    expect(r).toBeGreaterThan(b + 80);
    expect(accent.chroma).toBeGreaterThan(ACCENT_MIN_CHROMA);
  });

  it('is deterministic', () => {
    expect(extractPalette(GRADED)).toEqual(extractPalette([...GRADED]));
  });

  it('falls back on empty or transparent input', () => {
    expect(extractPalette([])).toBe(FALLBACK_PALETTE);
    expect(extractPalette([10, 10, 10, 0])).toBe(FALLBACK_PALETTE);
  });
});

describe('extractPalette on a muted photo with a small vivid subject', () => {
  // A grey sky, dark ground, brown rocks and a small green jacket (~0.6 % of the frame).
  const STREET = pixels([
    ['#c3b9b6', 4300],
    ['#190f0d', 2600],
    ['#2a1f16', 1100],
    ['#413622', 800],
    ['#6c593a', 400],
    ['#2f5a38', 60],
  ]);

  it('finds the small vivid subject as the accent, not the large dull areas', () => {
    const { accent } = extractPalette(STREET);
    const [r, g, b] = hexToRgb(accent.hex);
    expect(g).toBeGreaterThan(r + 15);
    expect(g).toBeGreaterThan(b + 15);
    expect(accent.chroma).toBeGreaterThanOrEqual(ACCENT_MIN_CHROMA);
  });

  it('picks main colours that differ, not three shades of one', () => {
    const { main } = extractPalette(STREET);
    const lightness = main.map((swatch) => swatch.lightness).sort((a, b) => a - b);
    expect(main.length).toBeGreaterThanOrEqual(3);
    expect((lightness.at(-1) ?? 0) - (lightness[0] ?? 0)).toBeGreaterThan(50);
  });
});

describe('paletteWedges', () => {
  it('gives 8 wedges: main colours dark to light, then two accent wedges', () => {
    const palette = extractPalette(GRADED);
    const wedges = paletteWedges(palette);
    expect(wedges).toHaveLength(8);
    expect(wedges.slice(6).every((wedge) => wedge.accent && wedge.color === palette.accent.hex)).toBe(true);
    const lightness = (hex: string) => hexToRgb(hex).reduce((sum, channel) => sum + channel, 0);
    const main = wedges.slice(0, 6).map((wedge) => lightness(wedge.color));
    expect(main).toEqual([...main].sort((a, b) => a - b));
    // The heaviest colour gets the most wedges.
    expect(wedges.filter((wedge) => wedge.color === palette.main[0]?.hex).length).toBeGreaterThanOrEqual(2);
  });

  it('uses all wedges for the main colours of a colourless photo', () => {
    const grey = extractPalette(
      pixels([
        ['#202020', 500],
        ['#808080', 300],
        ['#e0e0e0', 200],
      ]),
    );
    const wedges = paletteWedges(grey);
    expect(wedges).toHaveLength(8);
    expect(wedges.some((wedge) => wedge.accent)).toBe(false);
    expect(darkestColor(grey)).toMatch(/^#1[ef]1[ef]1[ef]|#202020|#212121$/);
  });
});
