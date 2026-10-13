// Pure motion helpers (no React / Remotion imports): usable from isomorphic registries.

export type EasingFn = (t: number) => number;

/** CSS-style cubic-bezier easing (x1, y1, x2, y2), solved by bisection. */
export const cubicBezier = (x1: number, y1: number, x2: number, y2: number): EasingFn => {
  const component = (s: number, a: number, b: number): number =>
    3 * (1 - s) * (1 - s) * s * a + 3 * (1 - s) * s * s * b + s * s * s;
  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let low = 0;
    let high = 1;
    let s = t;
    for (let index = 0; index < 32; index += 1) {
      s = (low + high) / 2;
      if (component(s, x1, x2) < t) low = s;
      else high = s;
    }
    return component(s, y1, y2);
  };
};

/** Curated easing curves; keep motion consistent across templates. */
export const ease = {
  linear: (t: number) => t,
  outCubic: cubicBezier(0.33, 1, 0.68, 1),
  outQuint: cubicBezier(0.22, 1, 0.36, 1),
  outExpo: cubicBezier(0.16, 1, 0.3, 1),
  inOutSine: cubicBezier(0.37, 0, 0.63, 1),
  inOutCubic: cubicBezier(0.65, 0, 0.35, 1),
  inOutQuart: cubicBezier(0.76, 0, 0.24, 1),
  inCubic: cubicBezier(0.32, 0, 0.67, 0),
} satisfies Record<string, EasingFn>;

export const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

export const mix = (from: number, to: number, t: number): number => from + (to - from) * t;

/** Eased 0..1 progress of `frame` through [start, start + duration]. */
export const progress = (
  frame: number,
  start: number,
  duration: number,
  easing: EasingFn = ease.linear,
): number => (duration <= 0 ? (frame >= start ? 1 : 0) : easing(clamp01((frame - start) / duration)));

/** 0 -> 1 -> 0 over t in [0, 1]; handy for transient light/glow effects. */
export const bell = (t: number): number => Math.sin(Math.PI * clamp01(t));

export interface Keyframe {
  readonly at: number;
  readonly value: number;
}

/** Piecewise keyframe interpolation with easing applied per segment. */
export const keyframes = (
  t: number,
  frames: readonly Keyframe[],
  easing: EasingFn = ease.inOutCubic,
): number => {
  const first = frames[0];
  const last = frames[frames.length - 1];
  if (!first || !last) {
    return 0;
  }
  if (t <= first.at) {
    return first.value;
  }
  for (let index = 1; index < frames.length; index += 1) {
    const from = frames[index - 1];
    const to = frames[index];
    if (from && to && t <= to.at) {
      const local = to.at === from.at ? 1 : (t - from.at) / (to.at - from.at);
      return mix(from.value, to.value, easing(local));
    }
  }
  return last.value;
};
