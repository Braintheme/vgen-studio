/** `#rrggbb` + alpha -> `rgba()`; invalid input falls back to black. */
export const withAlpha = (hex: string, alpha: number): string => {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) {
    return `rgba(0,0,0,${alpha})`;
  }
  const [, r, g, b] = match;
  return `rgba(${parseInt(r ?? '0', 16)},${parseInt(g ?? '0', 16)},${parseInt(b ?? '0', 16)},${alpha})`;
};
