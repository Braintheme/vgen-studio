// Pure layout math; the React hook lives in hooks.ts.

export type Orientation = 'portrait' | 'landscape' | 'square';

export interface Insets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export interface Layout {
  readonly width: number;
  readonly height: number;
  readonly orientation: Orientation;
  /** 1 at 1080 px on the short side; multiply design sizes by it. */
  readonly unit: number;
  /** Areas covered by social app UI (captions, buttons); keep text out of them. */
  readonly safe: Insets;
}

const orientationOf = (width: number, height: number): Orientation => {
  const ratio = width / height;
  if (ratio > 1.05) return 'landscape';
  if (ratio < 0.95) return 'portrait';
  return 'square';
};

/**
 * Safe-area insets as fractions of the frame. Tall vertical video (9:16) has the
 * heaviest overlays: status/top bar above, caption + action buttons below/right.
 */
const SAFE_FRACTIONS: Record<'tall' | 'portrait' | 'square' | 'landscape', Insets> = {
  tall: { top: 0.11, right: 0.08, bottom: 0.2, left: 0.06 },
  portrait: { top: 0.07, right: 0.06, bottom: 0.11, left: 0.06 },
  square: { top: 0.06, right: 0.06, bottom: 0.08, left: 0.06 },
  landscape: { top: 0.07, right: 0.05, bottom: 0.09, left: 0.05 },
};

export const computeLayout = (width: number, height: number): Layout => {
  const orientation = orientationOf(width, height);
  const ratio = width / height;
  const key = orientation === 'portrait' ? (ratio < 0.7 ? 'tall' : 'portrait') : orientation;
  const fractions = SAFE_FRACTIONS[key];
  return {
    width,
    height,
    orientation,
    unit: Math.min(width, height) / 1080,
    safe: {
      top: fractions.top * height,
      right: fractions.right * width,
      bottom: fractions.bottom * height,
      left: fractions.left * width,
    },
  };
};
