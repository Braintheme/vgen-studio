// Sub-pixel smooth placement for anything that moves across frames.
//
// Renders run in headless Chrome Headless Shell (software raster), which differs from the
// browser preview in two ways that make slowly moving overlays judder:
//  1. Layout-driven positions (`left`, `top`, `width`, `letter-spacing`...) are snapped to
//     whole pixels when painted, so a 0.2 px/frame drift becomes a 1 px jump every 5 frames.
//  2. Text drawn with a translate-only transform is rasterized with glyph origins snapped to
//     the pixel grid, so glyphs wobble against their own box at fractional offsets.
// Moving elements therefore never animate layout properties: they sit at (0, 0) and move by
// `translate3d`, plus a negligible rotation that makes Skia position glyphs unsnapped.

/** Visually a no-op; switches text rasterization to sub-pixel positioned glyphs. */
export const SUBPIXEL_TEXT_TRANSFORM = 'rotate(0.01deg)';

/** Which edge of the element sits at `x`: its left edge, or its right edge. */
export type PlacementAnchor = 'start' | 'end';

export interface Placement {
  readonly position: 'absolute';
  readonly left: 0;
  readonly top: 0;
  readonly transform: string;
  readonly willChange: 'transform';
}

/**
 * Absolutely positions an element at (x, y) px with transforms only. `transform` is applied
 * after the translation (e.g. a scale around the element's own origin).
 */
export const placeAt = (
  x: number,
  y: number,
  options: { readonly anchor?: PlacementAnchor; readonly transform?: string } = {},
): Placement => {
  const parts = [
    `translate3d(${x.toFixed(3)}px, ${y.toFixed(3)}px, 0)`,
    options.anchor === 'end' ? 'translateX(-100%)' : '',
    options.transform ?? '',
    SUBPIXEL_TEXT_TRANSFORM,
  ];
  return {
    position: 'absolute',
    left: 0,
    top: 0,
    transform: parts.filter(Boolean).join(' '),
    willChange: 'transform',
  };
};
