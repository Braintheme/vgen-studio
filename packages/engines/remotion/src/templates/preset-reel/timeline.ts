// Pure timeline of the preset reel (no React): composition + manifest + tests.
// Timings come from the reference (references/2, 59.94 fps, see breakdown.md). The clip,
// the screenshots and the card holds are chosen by the user, so the length is derived.

/** Seconds. */
export const TIMING = {
  /** A seam is centered on its section boundary (punch zoom: ~0.25 s out, ~0.25 s in). */
  seam: 0.5,
  /** Punch-in on the camera screen (f612-622: ~10 frames). */
  punchIn: 0.2,
  /** The punch-in must leave this much of the clip after it. */
  punchInTail: 0.3,
  /** Title entrance: first line starts, each line rises, the next one follows. */
  titleIn: 0.15,
  titleRise: 0.6,
  titleStagger: 0.09,
  titleOut: 0.18,
  /** The card photo settles inside its window after the cut. */
  cardSettle: 0.7,
} as const;

export interface Span {
  readonly from: number;
  /** Exclusive. */
  readonly to: number;
}

export interface ReelTimelineInput {
  readonly fps: number;
  /** Length of the chosen clip fragment. */
  readonly clipSec: number;
  readonly screens: number;
  readonly screenSec: number;
  readonly beforeHoldSec: number;
  /** Natural length of the chosen reveal effect. */
  readonly revealSec: number;
  readonly afterHoldSec: number;
  /** Punch-in moment, seconds into the clip, or null. */
  readonly punchInAtSec: number | null;
  /** The shutter clicks this long before the zoom into the settings starts. */
  readonly shutterBeforeSec: number;
  /** Another finale's own length (the palette process), replacing the card's holds and reveal. */
  readonly finaleSec?: number | null;
}

export interface ReelTimeline {
  readonly totalFrames: number;
  readonly clip: Span;
  readonly settings: Span;
  readonly card: Span;
  readonly seamFrames: number;
  readonly screenFrames: number;
  readonly screens: number;
  /** Null when there is no punch-in (off, or too late in the clip). */
  readonly punchIn: { readonly from: number; readonly duration: number } | null;
  /** The title leaves with the punch-in, otherwise it rides the seam out with the clip. */
  readonly titleExit: number | null;
  readonly reveal: { readonly from: number; readonly duration: number };
  /** Start of the shutter sound. */
  readonly shutterAt: number;
  /**
   * Start of the swoosh: with the before/after wipe inside the card (a hair early, so the
   * sound's attack lands on the first movement). Start-aligned, so a long library swoosh
   * never spills back into the cut to the card.
   */
  readonly swooshAt: number;
}

/** The swoosh starts this many frames before the wipe. */
const SWOOSH_LEAD_FRAMES = 2;

export const reelTimeline = (input: ReelTimelineInput): ReelTimeline => {
  const frames = (sec: number): number => Math.round(sec * input.fps);
  const seamFrames = frames(TIMING.seam);
  const clipFrames = Math.max(1, frames(input.clipSec));
  const screens = Math.max(1, input.screens);
  const screenFrames = Math.max(1, frames(input.screenSec));
  const clip = { from: 0, to: clipFrames };
  const settings = { from: clip.to, to: clip.to + screens * screenFrames };
  const before = frames(input.beforeHoldSec);
  const revealFrames = Math.max(1, frames(input.revealSec));
  const finale = input.finaleSec ?? null;
  const card =
    finale === null
      ? { from: settings.to, to: settings.to + before + revealFrames + frames(input.afterHoldSec) }
      : { from: settings.to, to: settings.to + Math.max(1, frames(finale)) };
  const reveal =
    finale === null ? { from: card.from + before, duration: revealFrames } : { from: card.from, duration: 1 };

  const punchFrames = frames(TIMING.punchIn);
  const punchFrom = input.punchInAtSec === null ? null : frames(input.punchInAtSec);
  const punchIn =
    punchFrom !== null && punchFrom + punchFrames + frames(TIMING.punchInTail) <= clip.to
      ? { from: punchFrom, duration: punchFrames }
      : null;

  return {
    totalFrames: card.to,
    clip,
    settings,
    card,
    seamFrames,
    screenFrames,
    screens,
    punchIn,
    titleExit: punchIn ? punchIn.from : null,
    reveal,
    // Click, then the zoom into the settings (the seam starts half a seam before the cut).
    shutterAt: Math.max(0, clip.to - Math.round(seamFrames / 2) - frames(input.shutterBeforeSec)),
    swooshAt: Math.max(card.from, reveal.from - SWOOSH_LEAD_FRAMES),
  };
};

/** Which screenshot shows at a frame local to the settings section (hard switches). */
export const screenIndexAt = (localFrame: number, timeline: ReelTimeline): number =>
  Math.min(timeline.screens - 1, Math.max(0, Math.floor(localFrame / timeline.screenFrames)));
