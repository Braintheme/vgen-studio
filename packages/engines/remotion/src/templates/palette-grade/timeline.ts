// Pure timeline of the palette grade template (no React): composition + manifest + tests.
// Timings come from the reference (references/3, 30 fps, see breakdown.md). The grading
// "process" keeps its reference timing (it is cut to the music) unless its speed is changed;
// the opening hold has a chosen length and the final hold on the after photo takes the rest.

/** Reference timings, seconds from the start of the process (reference f18). */
export const PROCESS_SEC = {
  /** Camera push-in 1.00 -> 1.15 (f18-42, fitted). */
  pushIn: { at: 0, duration: 0.8 },
  /** First pie wedge (f21); the others follow clockwise. */
  wedgesAt: 0.1,
  /** Gap between two wedges (~1.6 frames). */
  wedgeStagger: 0.053,
  /** Each wedge turns from a light translucent tint into its colour. */
  wedgeMorph: 0.43,
  /** The photo loses its colour under the finished pie (f40-48). */
  desaturate: { at: 0.733, duration: 0.267 },
  /** Camera pulls back to 1.00 (f56-72, fitted). */
  pullBack: { at: 1.267, duration: 0.533 },
  /** The pie collapses into a dot while turning (f57-69, fitted). */
  collapse: { at: 1.3, duration: 0.4 },
  /** The dot is one solid colour from here (the last accent sliver gone by f75). */
  solidAt: 1.9,
  /** The dot bursts into particles (f86-100). */
  burst: { at: 2.267, duration: 0.467 },
  /** Monochrome before -> monochrome after: the grade's luminance (f97-116). */
  darken: { at: 2.633, duration: 0.633 },
  /** Particles that flew out fade with the darkening (f100-121). */
  scatterFade: { at: 2.733, duration: 0.7 },
  /** Slow linear push to the end (from f100). */
  slowPushAt: 2.733,
  /** The landed accent dots dissolve into the colour (f119-125). */
  landFade: { at: 3.367, duration: 0.2 },
  /** Colour comes back (f122-142, fitted; its long tail runs into the after hold). */
  color: { at: 3.467, duration: 0.667 },
  /** BEFORE glitches into AFTER (f123-135: the first letter already flickers on f124). */
  label: { at: 3.5, duration: 0.4 },
  /** End of the process (f140); the after hold follows. */
  end: 4.067,
} as const;

/** Holds, seconds: the reference's opening hold and the shortest ones allowed. */
export const HOLD_SEC = { intro: 0.6, minIntro: 0.3, minOutro: 0.8 } as const;

/** Camera scales (reference: measured against f0). */
export const CAMERA = {
  pushIn: 1.15,
  /** Slow push speed, scale per second (1.000 -> 1.055 over f100-206). */
  slowPushPerSec: 0.0156,
  slowPushMax: 1.08,
} as const;

export interface Span {
  readonly from: number;
  readonly duration: number;
}

export interface GradeTimeline {
  readonly totalFrames: number;
  /** Process speed actually used (a slow process is sped up to fit the video). */
  readonly speed: number;
  /** First frame of the process (end of the opening hold). */
  readonly start: number;
  readonly pushIn: Span;
  /** Appear frame of wedge `index` (fractional frames keep the stagger even). */
  readonly wedgeAt: (index: number) => number;
  readonly wedgeMorph: number;
  readonly desaturate: Span;
  readonly pullBack: Span;
  readonly collapse: Span;
  readonly solidAt: number;
  readonly burst: Span;
  readonly darken: Span;
  readonly scatterFade: Span;
  readonly slowPushAt: number;
  readonly landFade: Span;
  readonly color: Span;
  readonly label: Span;
  /** End of the process: the after photo holds from here. */
  readonly end: number;
}

export const gradeTimeline = (input: {
  readonly durationSec: number;
  readonly fps: number;
  /** Seconds on the before photo before the process starts. */
  readonly introHoldSec?: number;
  /** Process speed: 1 = the reference, 2 = twice as fast. */
  readonly speed?: number;
}): GradeTimeline => {
  const { fps } = input;
  const frames = (sec: number): number => Math.round(sec * fps);
  const totalFrames = Math.round(input.durationSec * fps);
  const totalSec = totalFrames / fps;
  // The process must fit with the shortest holds around it.
  const room = totalSec - HOLD_SEC.minIntro - HOLD_SEC.minOutro;
  const speed = Math.max(input.speed ?? 1, PROCESS_SEC.end / room);
  const processSec = PROCESS_SEC.end / speed;
  const introSec = Math.min(
    Math.max(input.introHoldSec ?? HOLD_SEC.intro, HOLD_SEC.minIntro),
    totalSec - processSec - HOLD_SEC.minOutro,
  );

  const start = frames(introSec);
  const scaled = (sec: number): number => frames(sec / speed);
  const at = (sec: number): number => start + scaled(sec);
  const span = (part: { readonly at: number; readonly duration: number }): Span => ({
    from: at(part.at),
    duration: scaled(part.duration),
  });
  return {
    totalFrames,
    speed,
    start,
    pushIn: span(PROCESS_SEC.pushIn),
    wedgeAt: (index) => start + ((PROCESS_SEC.wedgesAt + index * PROCESS_SEC.wedgeStagger) / speed) * fps,
    wedgeMorph: scaled(PROCESS_SEC.wedgeMorph),
    desaturate: span(PROCESS_SEC.desaturate),
    pullBack: span(PROCESS_SEC.pullBack),
    collapse: span(PROCESS_SEC.collapse),
    solidAt: at(PROCESS_SEC.solidAt),
    burst: span(PROCESS_SEC.burst),
    darken: span(PROCESS_SEC.darken),
    scatterFade: span(PROCESS_SEC.scatterFade),
    slowPushAt: at(PROCESS_SEC.slowPushAt),
    landFade: span(PROCESS_SEC.landFade),
    color: span(PROCESS_SEC.color),
    label: span(PROCESS_SEC.label),
    end: start + scaled(PROCESS_SEC.end),
  };
};
