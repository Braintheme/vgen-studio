// Pure motion-smoothness metrics for render regression checks (scripts/check-jitter.ts).
// Not used at runtime.

/** Position of a moving element in one frame. */
export interface MotionSample {
  readonly frame: number;
  /** Centroid x of the element's box (e.g. the label's dot), px. */
  readonly box: number;
  /** Centroid x of its text, px. */
  readonly text: number;
}

/**
 * Frame-to-frame step irregularity (what the eye sees as judder): the deviation from a
 * smooth path, differenced between consecutive frames. RMS and the worst single step.
 */
export interface MotionReport {
  /** The box: pixel-grid snapping of layout-positioned elements. */
  readonly boxStepPx: number;
  /** The text relative to its own box: glyph snapping. */
  readonly textVsBoxStepPx: number;
  /** The text itself: everything combined. */
  readonly textStepPx: number;
  readonly textStepPeakPx: number;
}

/** Residuals of a least-squares quadratic fit (removes smooth, eased motion). */
export const quadraticResiduals = (xs: readonly number[], ys: readonly number[]): number[] => {
  const n = xs.length;
  if (n < 3) return ys.map(() => 0);
  const mean = xs.reduce((sum, x) => sum + x, 0) / n;
  const t = xs.map((x) => x - mean);
  const s = [0, 1, 2, 3, 4].map((k) => t.reduce((sum, x) => sum + x ** k, 0));
  const r = [0, 1, 2].map((k) => t.reduce((sum, x, i) => sum + (ys[i] ?? 0) * x ** k, 0));
  const m = [
    [s[0] ?? 0, s[1] ?? 0, s[2] ?? 0],
    [s[1] ?? 0, s[2] ?? 0, s[3] ?? 0],
    [s[2] ?? 0, s[3] ?? 0, s[4] ?? 0],
  ];
  const det = (a: number[][]): number => {
    const [[a0 = 0, a1 = 0, a2 = 0] = [], [b0 = 0, b1 = 0, b2 = 0] = [], [c0 = 0, c1 = 0, c2 = 0] = []] = a;
    return a0 * (b1 * c2 - b2 * c1) - a1 * (b0 * c2 - b2 * c0) + a2 * (b0 * c1 - b1 * c0);
  };
  const d = det(m);
  // Cramer's rule: replace column k by the right-hand side.
  const coef = [0, 1, 2].map(
    (k) => det(m.map((row, i) => row.map((value, j) => (j === k ? (r[i] ?? 0) : value)))) / d,
  );
  return ys.map(
    (y, i) => y - ((coef[0] ?? 0) + (coef[1] ?? 0) * (t[i] ?? 0) + (coef[2] ?? 0) * (t[i] ?? 0) ** 2),
  );
};

const rms = (values: readonly number[]): number =>
  values.length === 0 ? 0 : Math.sqrt(values.reduce((sum, v) => sum + v * v, 0) / values.length);

const steps = (values: readonly number[]): number[] =>
  values.slice(1).map((value, index) => value - (values[index] ?? 0));

export const measureMotion = (samples: readonly MotionSample[]): MotionReport => {
  const frames = samples.map((sample) => sample.frame);
  const jitter = (values: readonly number[]): number[] => steps(quadraticResiduals(frames, values));
  const text = jitter(samples.map((sample) => sample.text));
  return {
    boxStepPx: rms(jitter(samples.map((sample) => sample.box))),
    textVsBoxStepPx: rms(jitter(samples.map((sample) => sample.text - sample.box))),
    textStepPx: rms(text),
    textStepPeakPx: Math.max(0, ...text.map(Math.abs)),
  };
};

/**
 * Pass limits, set between measured renders of the before/after label drift (9:16):
 *
 * | px                | smooth (current) | no sub-pixel text rotation | layout (`left`) positioning |
 * | ----------------- | ---------------- | -------------------------- | --------------------------- |
 * | boxStepPx         | 0.031            | 0.025                      | 0.400                       |
 * | textVsBoxStepPx   | 0.132            | 0.261                      | 0.002                       |
 * | textStepPx        | 0.134            | 0.267                      | 0.398                       |
 * | textStepPeakPx    | 0.309            | 0.616                      | 0.851                       |
 *
 * Renders are deterministic, so a failure means the renderer changed, not noise.
 */
export const MOTION_LIMITS: MotionReport = {
  boxStepPx: 0.12,
  textVsBoxStepPx: 0.19,
  textStepPx: 0.19,
  textStepPeakPx: 0.45,
};

export const motionFailures = (report: MotionReport, limits: MotionReport = MOTION_LIMITS): string[] =>
  (Object.keys(limits) as (keyof MotionReport)[])
    .filter((key) => report[key] > limits[key])
    .map((key) => `${key} ${report[key].toFixed(3)} px > ${limits[key].toFixed(3)} px`);
