import { ACCENT_MIN_CHROMA, type PaletteSwatch, type PhotoPalette } from './extract.js';

/**
 * Up to `count` distinct colours of a photo for a row of swatches: the main colours, the
 * accent when it is vivid, then the next largest clusters (photos with few colours give fewer).
 */
export const paletteSwatches = (palette: PhotoPalette, count: number): PaletteSwatch[] => {
  const vividAccent = palette.accent.chroma >= ACCENT_MIN_CHROMA ? [palette.accent] : [];
  const seen = new Set<string>();
  return [...palette.main, ...vividAccent, ...palette.swatches]
    .filter((swatch) => {
      if (seen.has(swatch.hex)) return false;
      seen.add(swatch.hex);
      return true;
    })
    .slice(0, Math.max(0, count));
};
