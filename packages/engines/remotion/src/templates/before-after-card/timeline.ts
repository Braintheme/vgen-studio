// Pure timeline of the before/after card template (no React): composition + manifest + tests.
// Timings come from the reference cut (references/1, 30 fps, see breakdown.md): moves keep
// their reference durations (that is their character); the holds absorb the chosen length.
import { distributeFrames } from '@vgen/shared';

/** Reference move durations, seconds. */
export const MOVES_SEC = {
  /** Full bleed -> card (f53-109, fitted to the reference motion curve). */
  shrink: 1.87,
  /** Card -> full bleed (f165-217, fitted; visually full bleed from ~f203, then a long tail). */
  expand: 1.73,
  /** Before shown again at the end (f237-254), softened with crossfades. */
  flashBefore: 0.57,
  /** Back to after with a small settle zoom (f254-267). */
  flashAfter: 0.43,
} as const;

/** Holds (reference seconds = weights) with minimums. */
const HOLDS = [
  { id: 'intro', weight: 1.77, minSec: 0.5 },
  { id: 'cardBefore', weight: 0.17, minSec: 0.1 },
  // The after label types during the reveal's tail and this hold.
  { id: 'cardAfter', weight: 0.67, minSec: 0.2 },
  { id: 'fullAfter', weight: 0.67, minSec: 0.5 },
] as const;

/** Label timings, seconds. */
export const LABEL_SEC = {
  /** The before label fades in this long after the shrink starts (f64). */
  beforeIn: 0.37,
  beforeFade: 0.13,
  /** Typing speed of the after label (~3.6 frames per character). */
  perChar: 0.12,
  /** The after label fades out this long into the expansion (f174). */
  afterOut: 0.3,
  afterFade: 0.2,
} as const;

export interface Span {
  readonly from: number;
  readonly duration: number;
}

export interface CardTimeline {
  readonly totalFrames: number;
  readonly shrink: Span;
  readonly reveal: Span;
  readonly expand: Span;
  /** Null when the end flash is off. */
  readonly flash: { readonly before: Span; readonly after: Span } | null;
  /** Frame at which the before label is replaced by the typing after label. */
  readonly labelSwap: number;
}

export const cardTimeline = (input: {
  readonly durationSec: number;
  readonly fps: number;
  readonly endFlash: boolean;
  /** Length of the reveal inside the card (the chosen effect's natural length). */
  readonly revealSec: number;
  /** Fraction of the reveal from which "after" dominates: the labels swap there. */
  readonly revealedAt: number;
}): CardTimeline => {
  const { fps } = input;
  const frames = (sec: number): number => Math.round(sec * fps);
  const totalFrames = Math.round(input.durationSec * fps);
  const moves = {
    shrink: frames(MOVES_SEC.shrink),
    reveal: frames(input.revealSec),
    expand: frames(MOVES_SEC.expand),
    flashBefore: input.endFlash ? frames(MOVES_SEC.flashBefore) : 0,
    flashAfter: input.endFlash ? frames(MOVES_SEC.flashAfter) : 0,
  };
  const moveFrames = Object.values(moves).reduce((sum, value) => sum + value, 0);
  const holds = Object.fromEntries(
    distributeFrames(
      HOLDS.map((hold) => ({ id: hold.id, weight: hold.weight, minFrames: frames(hold.minSec) })),
      totalFrames - moveFrames,
    ).map((segment) => [segment.id, segment.durationInFrames]),
  ) as Record<(typeof HOLDS)[number]['id'], number>;

  const shrink = { from: holds.intro, duration: moves.shrink };
  const reveal = { from: shrink.from + shrink.duration + holds.cardBefore, duration: moves.reveal };
  const expand = { from: reveal.from + reveal.duration + holds.cardAfter, duration: moves.expand };
  const flashFrom = expand.from + expand.duration + holds.fullAfter;
  return {
    totalFrames,
    shrink,
    reveal,
    expand,
    flash: input.endFlash
      ? {
          before: { from: flashFrom, duration: moves.flashBefore },
          after: { from: flashFrom + moves.flashBefore, duration: moves.flashAfter },
        }
      : null,
    labelSwap: reveal.from + Math.round(reveal.duration * input.revealedAt),
  };
};
