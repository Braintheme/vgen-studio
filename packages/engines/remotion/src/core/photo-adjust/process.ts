// Pure pixel processing of photo adjustments (no DOM): RGBA in, RGBA out, in place.
// Order: exposure and white balance in linear light; then a tone curve (contrast, highlights,
// shadows) and clarity on luminance, applied as a ratio so hues stay put; then saturation and
// vibrance. Deterministic: same pixels and values, same result.
import type { Adjustments } from './schema.js';

const LINEAR_STEPS = 4096;
const TONE_STEPS = 1024;

const SRGB_TO_LINEAR = Float32Array.from({ length: 256 }, (_, value) => {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
});
const LINEAR_TO_SRGB = Float32Array.from({ length: LINEAR_STEPS + 1 }, (_, step) => {
  const v = step / LINEAR_STEPS;
  return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
});
const toSrgb = (linear: number): number =>
  LINEAR_TO_SRGB[Math.round(Math.min(1, Math.max(0, linear)) * LINEAR_STEPS)] ?? 0;

const smoothstep = (from: number, to: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

/** Luminance -> luminance: contrast (S-curve around the middle), highlights, shadows. */
export const toneCurve = (adjustments: Adjustments): Float32Array => {
  const contrast = adjustments.contrast / 100;
  const highlights = adjustments.highlights / 100;
  const shadows = adjustments.shadows / 100;
  // k > 1 steepens the middle (more contrast), k < 1 flattens it.
  const k = Math.max(0.35, 1 + contrast * (contrast > 0 ? 0.9 : 0.6));
  return Float32Array.from({ length: TONE_STEPS + 1 }, (_, step) => {
    const x = step / TONE_STEPS;
    let y = x < 0.5 ? 0.5 * (2 * x) ** k : 1 - 0.5 * (2 * (1 - x)) ** k;
    // Shadows lift / crush the lower range, highlights recover / boost the upper one; both
    // fade out towards the far end, so black and white points stay where they are.
    y += shadows * 0.28 * (1 - smoothstep(0, 0.65, y)) * Math.min(1, y * 6);
    y += highlights * 0.28 * smoothstep(0.35, 1, y) * Math.min(1, (1 - y) * 6);
    return Math.min(1, Math.max(0, y));
  });
};

/** Box blur of a single channel, three passes (close to a gaussian). */
const blur = (source: Float32Array, width: number, height: number, radius: number): Float32Array => {
  const current = Float32Array.from(source);
  const next = new Float32Array(source.length);
  const pass = (from: Float32Array, to: Float32Array, horizontal: boolean): void => {
    const outer = horizontal ? height : width;
    const inner = horizontal ? width : height;
    const at = (o: number, i: number): number => (horizontal ? o * width + i : i * width + o);
    const span = 2 * radius + 1;
    for (let o = 0; o < outer; o += 1) {
      let sum = 0;
      for (let i = -radius; i <= radius; i += 1) sum += from[at(o, Math.min(inner - 1, Math.max(0, i)))] ?? 0;
      for (let i = 0; i < inner; i += 1) {
        to[at(o, i)] = sum / span;
        const add = Math.min(inner - 1, i + radius + 1);
        const drop = Math.max(0, i - radius);
        sum += (from[at(o, add)] ?? 0) - (from[at(o, drop)] ?? 0);
      }
    }
  };
  for (let round = 0; round < 3; round += 1) {
    pass(current, next, true);
    pass(next, current, false);
  }
  return current;
};

/** Clarity's blur radius, as a share of the image's long side (resolution independent). */
const CLARITY_RADIUS = 0.012;
/** Local contrast is taken only up to this luminance difference (no halos at strong edges). */
const CLARITY_DETAIL_LIMIT = 0.08;

/** Applies the adjustments to RGBA pixels in place. */
export const applyAdjustments = (
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  adjustments: Adjustments,
): void => {
  const count = width * height;
  const exposure = 2 ** (adjustments.exposure / 100);
  const temperature = adjustments.temperature / 100;
  const tint = adjustments.tint / 100;
  // Warmer = more red, less blue; tint + = magenta (less green).
  const gain = [
    exposure * (1 + 0.18 * temperature) * (1 + 0.05 * tint),
    exposure * (1 - 0.12 * tint),
    exposure * (1 - 0.18 * temperature) * (1 + 0.05 * tint),
  ] as const;
  const tone = toneCurve(adjustments);
  const clarity = adjustments.clarity / 100;
  const saturation = 1 + adjustments.saturation / 100;
  const vibrance = adjustments.vibrance / 100;

  // Pass 1: white balance + exposure (linear light), back to sRGB, luminance.
  const rgb = new Float32Array(count * 3);
  const luma = new Float32Array(count);
  for (let p = 0; p < count; p += 1) {
    const r = toSrgb((SRGB_TO_LINEAR[rgba[p * 4] ?? 0] ?? 0) * gain[0]);
    const g = toSrgb((SRGB_TO_LINEAR[rgba[p * 4 + 1] ?? 0] ?? 0) * gain[1]);
    const b = toSrgb((SRGB_TO_LINEAR[rgba[p * 4 + 2] ?? 0] ?? 0) * gain[2]);
    rgb[p * 3] = r;
    rgb[p * 3 + 1] = g;
    rgb[p * 3 + 2] = b;
    luma[p] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  // Clarity: local contrast of the midtones against a wide blur.
  const radius = Math.max(1, Math.round(CLARITY_RADIUS * Math.max(width, height)));
  const local = clarity !== 0 ? blur(luma, width, height, radius) : null;

  // Pass 2: tone + clarity on luminance (as a ratio), then saturation and vibrance.
  for (let p = 0; p < count; p += 1) {
    const y = luma[p] ?? 0;
    let target = tone[Math.round(Math.min(1, Math.max(0, y)) * TONE_STEPS)] ?? y;
    if (local) {
      const midtones = 1 - (2 * target - 1) ** 2;
      // Clamped detail: strong edges (a white bench on dark ground) get no halo; softening
      // (negative clarity) is gentler than crisping.
      const detail = Math.max(-CLARITY_DETAIL_LIMIT, Math.min(CLARITY_DETAIL_LIMIT, y - (local[p] ?? y)));
      target += clarity * (clarity > 0 ? 1.4 : 0.8) * detail * midtones;
    }
    target = Math.min(1, Math.max(0, target));
    const ratio = y > 1e-4 ? target / y : 1;
    let r = (rgb[p * 3] ?? 0) * ratio + (y > 1e-4 ? 0 : target);
    let g = (rgb[p * 3 + 1] ?? 0) * ratio + (y > 1e-4 ? 0 : target);
    let b = (rgb[p * 3 + 2] ?? 0) * ratio + (y > 1e-4 ? 0 : target);
    if (saturation !== 1 || vibrance !== 0) {
      const grey = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const current = Math.max(r, g, b) - Math.min(r, g, b);
      // Vibrance pushes the dull colours more than the already saturated ones.
      const factor = Math.max(0, saturation + vibrance * (1 - Math.min(1, current * 1.5)));
      r = grey + (r - grey) * factor;
      g = grey + (g - grey) * factor;
      b = grey + (b - grey) * factor;
    }
    rgba[p * 4] = Math.round(Math.min(1, Math.max(0, r)) * 255);
    rgba[p * 4 + 1] = Math.round(Math.min(1, Math.max(0, g)) * 255);
    rgba[p * 4 + 2] = Math.round(Math.min(1, Math.max(0, b)) * 255);
  }
};
