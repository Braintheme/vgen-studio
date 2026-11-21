// Geometry of the Instagram-style fill: the lines' boxes merged into one rounded shape, with
// concave corners where a line is wider than its neighbour (as Instagram draws its text
// highlight). Pure; isomorphic.

/** A line's box, horizontally (design px of the block). Rows are stacked without gaps. */
export interface PlateRow {
  readonly left: number;
  readonly right: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface PlateRun {
  /** Index of the run's first line in the text. */
  readonly start: number;
  readonly lines: string[];
}

/** Runs of non-blank lines: a blank line splits the fill. */
export const plateRuns = (lines: readonly string[]): PlateRun[] => {
  const runs: PlateRun[] = [];
  let current: PlateRun | null = null;
  lines.forEach((line, index) => {
    if (line.trim().length === 0) {
      current = null;
      return;
    }
    if (current === null) {
      current = { start: index, lines: [] };
      runs.push(current);
    }
    current.lines.push(line);
  });
  return runs;
};

/** Neighbouring edges closer than `snap` take the wider value (no hairline steps). */
const snapRows = (rows: readonly PlateRow[], snap: number): PlateRow[] => {
  const left = rows.map((row) => row.left);
  const right = rows.map((row) => row.right);
  for (let changed = true; changed;) {
    changed = false;
    for (let index = 1; index < rows.length; index += 1) {
      const [l0, l1, r0, r1] = [left[index - 1], left[index], right[index - 1], right[index]] as [
        number,
        number,
        number,
        number,
      ];
      if (l0 !== l1 && Math.abs(l0 - l1) < snap) {
        left[index - 1] = left[index] = Math.min(l0, l1);
        changed = true;
      }
      if (r0 !== r1 && Math.abs(r0 - r1) < snap) {
        right[index - 1] = right[index] = Math.max(r0, r1);
        changed = true;
      }
    }
  }
  return rows.map((_, index) => ({ left: left[index] ?? 0, right: right[index] ?? 0 }));
};

/**
 * Clockwise corners of the union of stacked rows (row i spans y from i·h to (i+1)·h), starting
 * at the top-left. Rows are expected to overlap their neighbours horizontally.
 */
export const plateCorners = (rows: readonly PlateRow[], rowHeight: number, snap: number): Point[] => {
  const snapped = snapRows(rows, snap);
  const first = snapped[0];
  const last = snapped.at(-1);
  if (!first || !last) return [];
  const points: Point[] = [
    { x: first.left, y: 0 },
    { x: first.right, y: 0 },
  ];
  for (let index = 0; index < snapped.length - 1; index += 1) {
    const [upper, lower] = [snapped[index], snapped[index + 1]] as [PlateRow, PlateRow];
    if (upper.right !== lower.right) {
      const y = (index + 1) * rowHeight;
      points.push({ x: upper.right, y }, { x: lower.right, y });
    }
  }
  const bottom = snapped.length * rowHeight;
  points.push({ x: last.right, y: bottom }, { x: last.left, y: bottom });
  for (let index = snapped.length - 2; index >= 0; index -= 1) {
    const [upper, lower] = [snapped[index], snapped[index + 1]] as [PlateRow, PlateRow];
    if (upper.left !== lower.left) {
      const y = (index + 1) * rowHeight;
      points.push({ x: lower.left, y }, { x: upper.left, y });
    }
  }
  return points;
};

/** Circle-like cubic handle length. */
const KAPPA = 0.5523;

const fmt = (value: number): string => value.toFixed(2);

/** A closed SVG path through the corners, each rounded (at most half of either adjacent edge). */
export const roundedPath = (points: readonly Point[], radius: number): string => {
  if (points.length < 3) return '';
  const parts: string[] = [];
  points.forEach((corner, index) => {
    const prev = points[(index - 1 + points.length) % points.length] as Point;
    const next = points[(index + 1) % points.length] as Point;
    const toPrev = Math.hypot(prev.x - corner.x, prev.y - corner.y);
    const toNext = Math.hypot(next.x - corner.x, next.y - corner.y);
    const r = Math.max(0, Math.min(radius, toPrev / 2, toNext / 2));
    const a = {
      x: corner.x + ((prev.x - corner.x) / (toPrev || 1)) * r,
      y: corner.y + ((prev.y - corner.y) / (toPrev || 1)) * r,
    };
    const b = {
      x: corner.x + ((next.x - corner.x) / (toNext || 1)) * r,
      y: corner.y + ((next.y - corner.y) / (toNext || 1)) * r,
    };
    const c1 = { x: a.x + (corner.x - a.x) * KAPPA, y: a.y + (corner.y - a.y) * KAPPA };
    const c2 = { x: b.x + (corner.x - b.x) * KAPPA, y: b.y + (corner.y - b.y) * KAPPA };
    parts.push(
      `${index === 0 ? 'M' : 'L'}${fmt(a.x)} ${fmt(a.y)}`,
      `C${fmt(c1.x)} ${fmt(c1.y)} ${fmt(c2.x)} ${fmt(c2.y)} ${fmt(b.x)} ${fmt(b.y)}`,
    );
  });
  return `${parts.join(' ')} Z`;
};

/** Shrinks a block wider than the room (never grows it). */
export const fitScale = (widest: number, available: number): number =>
  widest > 0 ? Math.min(1, available / widest) : 1;
