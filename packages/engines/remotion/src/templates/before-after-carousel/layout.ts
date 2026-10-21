// Pure slide geometry, shared by the composition and the asset hook (no React).
import type { Size } from '@vgen/shared';

export const FRAMINGS = ['fill', 'fit'] as const;
export type Framing = (typeof FRAMINGS)[number];

/** Where a fill crop holds the photo: top / left, centre, bottom / right (the axis that overflows). */
export const ANCHORS = ['top', 'center', 'bottom'] as const;
export type Anchor = (typeof ANCHORS)[number];

/** Halves one above the other, or side by side. */
export const SPLITS = ['top-bottom', 'left-right'] as const;
export type Split = (typeof SPLITS)[number];

/** Integer pixel rectangle. */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface SlideCells {
  /** Top or left half. */
  readonly first: Rect;
  /** Bottom or right half. */
  readonly second: Rect;
  /** Centre of the seam between the halves: the palette sits there, along the seam. */
  readonly seam: { readonly x: number; readonly y: number };
}

/**
 * The frame cut into two halves of the same size (one above the other, or side by side),
 * `gap` pixels apart. An odd remainder goes to the gap, so both photos of a pair are drawn at
 * the same size.
 */
export const slideCells = (frame: Size, gap: number, split: Split): SlideCells => {
  const space = Math.max(0, Math.round(gap));
  if (split === 'left-right') {
    const cellWidth = Math.floor((frame.width - space) / 2);
    const rightX = frame.width - cellWidth;
    return {
      first: { x: 0, y: 0, width: cellWidth, height: frame.height },
      second: { x: rightX, y: 0, width: cellWidth, height: frame.height },
      seam: { x: (cellWidth + rightX) / 2, y: frame.height / 2 },
    };
  }
  const cellHeight = Math.floor((frame.height - space) / 2);
  const bottomY = frame.height - cellHeight;
  return {
    first: { x: 0, y: 0, width: frame.width, height: cellHeight },
    second: { x: 0, y: bottomY, width: frame.width, height: cellHeight },
    seam: { x: frame.width / 2, y: (cellHeight + bottomY) / 2 },
  };
};

/**
 * Where a photo is drawn inside a cell (cell coordinates, whole pixels). `fill` covers the cell,
 * cropping what sticks out on the one axis that overflows, held by the anchor (`top` = top or
 * left edge, `bottom` = bottom or right edge); `fit` shows the whole photo, centred.
 */
export const placePhoto = (photo: Size, cell: Size, framing: Framing, anchor: Anchor): Rect => {
  const scaleX = cell.width / photo.width;
  const scaleY = cell.height / photo.height;
  const scale = framing === 'fill' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
  const fit = (value: number, limit: number): number =>
    framing === 'fill' ? Math.max(limit, Math.round(value)) : Math.min(limit, Math.round(value));
  const width = fit(photo.width * scale, cell.width);
  const height = fit(photo.height * scale, cell.height);
  const offset = (free: number): number =>
    framing === 'fit' || anchor === 'center' ? Math.round(free / 2) : anchor === 'top' ? 0 : free;
  return { x: offset(cell.width - width), y: offset(cell.height - height), width, height };
};

/** Share of the photo hidden by `fill` (0 when the proportions match). */
export const cropShare = (photo: Size, cell: Size): number => {
  const photoRatio = photo.width / photo.height;
  const cellRatio = cell.width / cell.height;
  return 1 - Math.min(photoRatio, cellRatio) / Math.max(photoRatio, cellRatio);
};

/** Where a label sits inside its half. */
export const LABEL_POSITIONS = ['top', 'center', 'bottom'] as const;
export type LabelPosition = (typeof LABEL_POSITIONS)[number];

/** Average glyph width of a bold font in ems: enough to find the area behind a label. */
const GLYPH_EM = 0.62;

/** One text of a label block (the label, the caption under it), sizes in pixels. */
export interface TextPart {
  readonly text: string;
  readonly size: number;
  /** Multiple of the size. */
  readonly lineHeight: number;
  /** Em. */
  readonly letterSpacing: number;
}

export interface BlockPlacement {
  /** Space between the parts, edge distance of top / bottom blocks (pixels). */
  readonly gap: number;
  readonly offset: number;
  readonly position: LabelPosition;
}

/**
 * The area a label block (its texts stacked, centred) covers inside its cell, in cell
 * coordinates, estimated from the texts: the auto contrast measures the photo there. Top /
 * bottom blocks keep `offset` from the edge.
 */
export const labelBox = (cell: Size, parts: readonly TextPart[], placement: BlockPlacement): Rect => {
  const sizes = parts.map((part) => {
    const lines = part.text.split('\n');
    const longest = lines.reduce((length, line) => Math.max(length, line.trim().length), 1);
    return {
      width: longest * part.size * (GLYPH_EM + part.letterSpacing),
      height: lines.length * part.size * part.lineHeight,
    };
  });
  const gaps = Math.max(0, parts.length - 1) * placement.gap;
  const height = Math.min(
    cell.height,
    sizes.reduce((sum, size) => sum + size.height, gaps),
  );
  const width = Math.min(cell.width, Math.max(0, ...sizes.map((size) => size.width)));
  const y =
    placement.position === 'top'
      ? placement.offset
      : placement.position === 'bottom'
        ? cell.height - placement.offset - height
        : (cell.height - height) / 2;
  return {
    x: Math.round((cell.width - width) / 2),
    y: Math.round(Math.min(cell.height - height, Math.max(0, y))),
    width: Math.round(width),
    height: Math.round(height),
  };
};
