/** `#rrggbb` + alpha -> `rgba()`; invalid input falls back to black. */
export const withAlpha = (hex: string, alpha: number): string => {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) {
    return `rgba(0,0,0,${alpha})`;
  }
  const [, r, g, b] = match;
  return `rgba(${parseInt(r ?? '0', 16)},${parseInt(g ?? '0', 16)},${parseInt(b ?? '0', 16)},${alpha})`;
};

export type Rgb = readonly [number, number, number];

/** `#rrggbb` -> [r, g, b] (0..255); invalid input is black. */
export const hexToRgb = (hex: string): Rgb => {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) {
    return [0, 0, 0];
  }
  return [parseInt(match[1] ?? '0', 16), parseInt(match[2] ?? '0', 16), parseInt(match[3] ?? '0', 16)];
};

const channelHex = (value: number): string =>
  Math.round(Math.min(255, Math.max(0, value)))
    .toString(16)
    .padStart(2, '0');

export const rgbToHex = ([r, g, b]: Rgb): string => `#${channelHex(r)}${channelHex(g)}${channelHex(b)}`;

/** Straight sRGB mix of two `#rrggbb` colours (t = 0 -> `from`). */
export const mixHex = (from: string, to: string, t: number): string => {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  return rgbToHex([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
};

/** CIE L*a*b* (D65) of an sRGB colour: perceptual distances, lightness and chroma. */
export const rgbToLab = ([r, g, b]: Rgb): Rgb => {
  const linear = (channel: number): number => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const [lr, lg, lb] = [linear(r), linear(g), linear(b)];
  const x = (lr * 0.4124 + lg * 0.3576 + lb * 0.1805) / 0.95047;
  const y = lr * 0.2126 + lg * 0.7152 + lb * 0.0722;
  const z = (lr * 0.0193 + lg * 0.1192 + lb * 0.9505) / 1.08883;
  const f = (value: number): number => (value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
};

/** Chroma (colourfulness) of a Lab colour. */
export const labChroma = (lab: Rgb): number => Math.hypot(lab[1], lab[2]);

/** sRGB of a CIE L*a*b* (D65) colour, channels clamped to 0..255 (inverse of `rgbToLab`). */
export const labToRgb = ([l, a, b]: Rgb): Rgb => {
  const fy = (l + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const inverse = (value: number): number =>
    value ** 3 > 0.008856 ? value ** 3 : (value - 16 / 116) / 7.787;
  const x = inverse(fx) * 0.95047;
  const y = inverse(fy);
  const z = inverse(fz) * 1.08883;
  const gamma = (value: number): number => {
    const clamped = Math.min(1, Math.max(0, value));
    return 255 * (clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055);
  };
  return [
    gamma(x * 3.2406 + y * -1.5372 + z * -0.4986),
    gamma(x * -0.9689 + y * 1.8758 + z * 0.0415),
    gamma(x * 0.0557 + y * -0.204 + z * 1.057),
  ];
};
