// Pure timeline of the preset flip (no React): composition + manifest + tests.
// Timings come from the reference (references/4, 59.94 fps, see breakdown.md): the clip,
// a punch zoom into the photo, the before photo, one look per preset (label cuts ~0.87 s
// apart, dissolves around them) and the call to action on the last look.

/** Seconds. */
export const TIMING = {
  /** The zoom seam, centred on the cut (f390-433: ~0.37 s out, ~0.35 s in). */
  seam: 0.72,
  /** Label number swaps (when animated) take this long, centred on the label change. */
  labelSwap: 0.32,
  /** Title entrance: first line starts, each line takes this long, the next follows. */
  titleIn: 0.15,
  titleLine: 0.6,
  titleStagger: 0.09,
  /** CTA entrance (when animated). */
  ctaIn: 0.4,
  /** Palette effects: dot pop-in, stagger between dots, pop-out; burst flight. */
  dotIn: 0.32,
  dotStagger: 0.05,
  dotOut: 0.14,
  burst: 0.9,
} as const;

/** Defaults fitted to the reference (seconds). */
export const DEFAULTS = {
  clipSec: 6.87,
  beforeHoldSec: 1.06,
  presetSec: 0.87,
  ctaHoldSec: 1.7,
  shutterBeforeSec: 0.1,
} as const;

export interface Span {
  readonly from: number;
  /** Exclusive. */
  readonly to: number;
}

export interface FlipTimelineInput {
  readonly fps: number;
  /** Length of the chosen clip fragment. */
  readonly clipSec: number;
  /** Uploaded preset photos (at least one look is always shown). */
  readonly presets: number;
  /** From the cut to the first label. */
  readonly beforeHoldSec: number;
  /** From one label change to the next (and from the last one to the CTA). */
  readonly presetSec: number;
  /** The CTA stays this long, to the end. */
  readonly ctaHoldSec: number;
  /** Length of one photo change (the effect's natural length at the chosen speed). */
  readonly changeSec: number;
  /** Progress of the change at which the new look reads (the label cuts there). */
  readonly revealedAt: number;
  /** The shutter clicks this long before the zoom starts. */
  readonly shutterBeforeSec: number;
}

export interface PhotoChange {
  /** Index of the preset coming in (the before photo is -1). */
  readonly to: number;
  readonly from: number;
  readonly duration: number;
}

export interface FlipTimeline {
  readonly totalFrames: number;
  readonly clip: Span;
  /** The hard cut from the clip to the before photo (the photos section starts here). */
  readonly cut: number;
  readonly seamFrames: number;
  readonly presets: number;
  /** Label change of each preset (frame at which `#n` shows). */
  readonly labelAt: readonly number[];
  readonly changes: readonly PhotoChange[];
  /** The CTA replaces the label on the last look. */
  readonly ctaAt: number;
  readonly shutterAt: number;
  /** When the next change starts (the end of preset `index`'s time on screen). */
  readonly holdEnd: (index: number) => number;
}

export const flipTimeline = (input: FlipTimelineInput): FlipTimeline => {
  const frames = (sec: number): number => Math.round(sec * input.fps);
  const seamFrames = frames(TIMING.seam);
  const clip = { from: 0, to: Math.max(1, frames(input.clipSec)) };
  const cut = clip.to;
  const presets = Math.max(1, input.presets);
  const presetFrames = Math.max(1, frames(input.presetSec));
  const first = cut + Math.max(1, frames(input.beforeHoldSec));
  const labelAt = Array.from({ length: presets }, (_, index) => first + index * presetFrames);
  const ctaAt = first + presets * presetFrames;

  // A change never outlasts the time a look is on screen, and never starts before the
  // photo has landed.
  const landed = cut + Math.round(seamFrames / 2);
  const changeFrames = Math.max(1, Math.min(frames(input.changeSec), presetFrames, first - landed));
  const lead = Math.round(changeFrames * Math.min(1, Math.max(0, input.revealedAt)));
  const changes = labelAt.map((at, index) => ({
    to: index,
    from: Math.max(index === 0 ? landed : (labelAt[index - 1] ?? landed), at - lead),
    duration: changeFrames,
  }));
  const holdEnd = (index: number): number => changes[index + 1]?.from ?? ctaAt;

  return {
    totalFrames: ctaAt + Math.max(1, frames(input.ctaHoldSec)),
    clip,
    cut,
    seamFrames,
    presets,
    labelAt,
    changes,
    ctaAt,
    // Click, then the zoom (the seam starts half a seam before the cut).
    shutterAt: Math.max(0, cut - Math.round(seamFrames / 2) - frames(input.shutterBeforeSec)),
    holdEnd,
  };
};

export interface PhotoState {
  /** Shown photo (-1: before), or the outgoing one during a change. */
  readonly from: number;
  /** Incoming photo during a change, else null. */
  readonly to: number | null;
  /** Linear 0..1 progress of the change. */
  readonly progress: number;
}

/** Which photo (or which change) is on screen at an absolute frame of the photos section. */
export const photoStateAt = (frame: number, timeline: FlipTimeline): PhotoState => {
  let shown = -1;
  for (const change of timeline.changes) {
    if (frame < change.from) break;
    if (frame < change.from + change.duration) {
      return { from: change.to - 1, to: change.to, progress: (frame - change.from) / change.duration };
    }
    shown = change.to;
  }
  return { from: shown, to: null, progress: 0 };
};

/** Index of the preset whose label shows at a frame (null: before the first one or under the CTA). */
export const labelIndexAt = (frame: number, timeline: FlipTimeline): number | null => {
  if (frame >= timeline.ctaAt) return null;
  let index: number | null = null;
  timeline.labelAt.forEach((at, current) => {
    if (frame >= at) index = current;
  });
  return index;
};
