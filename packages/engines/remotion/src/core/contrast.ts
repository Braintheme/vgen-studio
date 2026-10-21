// Readability of text over photos (WCAG luminance and contrast), pure: no React / DOM.
import { hexToRgb, type Rgb } from './color.js';

const linear = (channel: number): number => {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

/** WCAG relative luminance of an sRGB colour: 0 (black) .. 1 (white). */
export const relativeLuminance = ([r, g, b]: Rgb): number =>
  0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

/** WCAG contrast ratio of two luminances: 1 (none) .. 21 (black on white). */
export const contrastRatio = (a: number, b: number): number =>
  (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** Mean relative luminance of RGBA pixels (e.g. canvas `ImageData.data`); transparent ones are skipped. */
export const meanLuminance = (rgba: ArrayLike<number>): number => {
  let sum = 0;
  let count = 0;
  for (let index = 0; index + 3 < rgba.length; index += 4) {
    if ((rgba[index + 3] ?? 0) < 8) continue;
    sum += relativeLuminance([rgba[index] ?? 0, rgba[index + 1] ?? 0, rgba[index + 2] ?? 0]);
    count += 1;
  }
  return count === 0 ? 0 : sum / count;
};

/**
 * Large bold labels stay readable from this contrast ratio on (WCAG asks 3 for large text; the
 * label shadow adds a little).
 */
export const READABLE_CONTRAST = 2.5;

/**
 * `preferred` while it is readable over a background of the given luminance, otherwise whichever
 * of the two colours stands out more.
 */
export const readableColor = (
  preferred: string,
  alternative: string,
  background: number,
  minRatio = READABLE_CONTRAST,
): string => {
  const ratioOf = (hex: string): number => contrastRatio(relativeLuminance(hexToRgb(hex)), background);
  const preferredRatio = ratioOf(preferred);
  if (preferredRatio >= minRatio) return preferred;
  return ratioOf(alternative) > preferredRatio ? alternative : preferred;
};
