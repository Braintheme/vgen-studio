// Pure maths of the clip grade (no DOM): per-channel tone tables and a saturation matrix, for
// an SVG filter (`feComponentTransfer` + `feColorMatrix`) applied to the video in the
// composition, so the player preview and the render are graded the same way.
import { toneCurve } from '../photo-adjust/process.js';
import {
  COLOR_WHEEL_ZONES,
  effectiveGrade,
  isNeutralGrade,
  type ColorWheel,
  type VideoGrade,
} from './schema.js';

/** Samples per channel table (the filter interpolates linearly between them). */
export const TABLE_STEPS = 64;
/** Strongest shift a wheel gives its zone, in 0..1 of a channel. */
const WHEEL_STRENGTH = { shadows: 0.12, midtones: 0.1, highlights: 0.12 } as const;

export interface GradeFilter {
  /** Tone tables for R, G and B (`tableValues`), 0..1. */
  readonly tables: readonly [readonly number[], readonly number[], readonly number[]];
  /** 4×5 colour matrix (row-major, `feColorMatrix type="matrix"`). */
  readonly matrix: readonly number[];
}

const srgbToLinear = (v: number): number => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const linearToSrgb = (v: number): number => {
  const c = Math.min(1, Math.max(0, v));
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
};

/** A wheel's tint as a per-channel offset with no overall brightness change. */
export const wheelTint = (wheel: ColorWheel): readonly [number, number, number] => {
  const amount = wheel.amount / 100;
  if (amount <= 0) return [0, 0, 0];
  const hue = (((wheel.hue % 360) + 360) % 360) / 60;
  // Fully saturated colour of the hue (HSV with S = V = 1).
  const x = 1 - Math.abs((hue % 2) - 1);
  const [r, g, b] =
    hue < 1
      ? [1, x, 0]
      : hue < 2
        ? [x, 1, 0]
        : hue < 3
          ? [0, 1, x]
          : hue < 4
            ? [0, x, 1]
            : hue < 5
              ? [x, 0, 1]
              : [1, 0, x];
  const mean = (r + g + b) / 3;
  return [(r - mean) * amount, (g - mean) * amount, (b - mean) * amount];
};

/** The filter for a grade, or null when it is neutral (then no filter is applied at all). */
export const gradeFilter = (grade: VideoGrade): GradeFilter | null => {
  if (isNeutralGrade(grade)) return null;
  const values = effectiveGrade(grade);
  // The photo adjustments' tone curve (contrast, highlights, shadows), per channel here.
  const tone = toneCurve({ ...values, clarity: 0 });
  const toneAt = (x: number): number =>
    tone[Math.round(Math.min(1, Math.max(0, x)) * (tone.length - 1))] ?? x;
  const exposure = 2 ** (values.exposure / 100);
  const temperature = values.temperature / 100;
  const tint = values.tint / 100;
  // Same white balance as the photos: warmer = more red, less blue; tint + = magenta.
  const gain = [
    exposure * (1 + 0.18 * temperature) * (1 + 0.05 * tint),
    exposure * (1 - 0.12 * tint),
    exposure * (1 - 0.18 * temperature) * (1 + 0.05 * tint),
  ] as const;
  const tints = COLOR_WHEEL_ZONES.map((zone) => ({ zone, shift: wheelTint(grade.wheels[zone]) }));

  const table = (channel: 0 | 1 | 2): number[] =>
    Array.from({ length: TABLE_STEPS + 1 }, (_, step) => {
      const x = step / TABLE_STEPS;
      let y = toneAt(linearToSrgb(srgbToLinear(x) * gain[channel]));
      // Wheels: shadows weigh the dark end, highlights the bright one, midtones the middle.
      for (const { zone, shift } of tints) {
        const weight = zone === 'shadows' ? (1 - y) ** 2 : zone === 'highlights' ? y ** 2 : 4 * y * (1 - y);
        y += shift[channel] * WHEEL_STRENGTH[zone] * 3 * weight;
      }
      return Math.round(Math.min(1, Math.max(0, y)) * 10000) / 10000;
    });

  // Saturation and an even share of vibrance (a filter cannot tell dull colours apart).
  const s = Math.max(0, 1 + values.saturation / 100 + (values.vibrance / 100) * 0.5);
  const [lr, lg, lb] = [0.2126, 0.7152, 0.0722];
  const matrix = [
    lr + (1 - lr) * s,
    lg - lg * s,
    lb - lb * s,
    0,
    0,
    lr - lr * s,
    lg + (1 - lg) * s,
    lb - lb * s,
    0,
    0,
    lr - lr * s,
    lg - lg * s,
    lb + (1 - lb) * s,
    0,
    0,
    0,
    0,
    0,
    1,
    0,
  ].map((v) => Math.round(v * 10000) / 10000);
  return { tables: [table(0), table(1), table(2)], matrix };
};
