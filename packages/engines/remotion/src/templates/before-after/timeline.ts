// Pure scene timeline (no React): shared by the composition and the manifest.
import { distributeFrames, type TimelineSegment } from '@vgen/shared';

export const SEGMENT_IDS = ['intro', 'before', 'reveal', 'after', 'finale', 'outro'] as const;
export type SegmentId = (typeof SEGMENT_IDS)[number];
export type BodySegmentId = Exclude<SegmentId, 'intro' | 'outro'>;

/**
 * Relative weights, in seconds of the 13 s reference cut:
 * intro 1.5 / before 2.75 / reveal 2 / after 3.75 / finale 1 / outro 2.
 * The outro got 0.5 s more than the brief's table so the CTA stays fully readable
 * for well over the required 1.5 s after it has animated in.
 */
const SEGMENTS: readonly { id: SegmentId; weight: number; minSec: number }[] = [
  { id: 'intro', weight: 1.5, minSec: 1.2 },
  { id: 'before', weight: 2.75, minSec: 1.3 },
  { id: 'reveal', weight: 2, minSec: 1.1 },
  { id: 'after', weight: 3.75, minSec: 1.8 },
  { id: 'finale', weight: 1, minSec: 0.7 },
  { id: 'outro', weight: 2, minSec: 1.8 },
];
// The minimums (7.9 s) must fit into the template's minimum duration (8 s); the
// timeline tests sweep every allowed duration to guarantee it.

const SEAM_SEC = 0.5;

export interface Span {
  readonly from: number;
  readonly durationInFrames: number;
}

export interface BeforeAfterTimeline {
  readonly totalFrames: number;
  /** Length of the intro->body and body->outro scene transitions. */
  readonly seamFrames: number;
  /** Where each scene is fully on screen, in global frames. */
  readonly segments: Readonly<Record<SegmentId, Span>>;
  /** TransitionSeries sequence lengths (they overlap by `seamFrames` at each seam). */
  readonly sequences: { readonly intro: number; readonly body: number; readonly outro: number };
  /** Body scenes in frames relative to the body sequence start. */
  readonly body: Readonly<Record<BodySegmentId, Span>>;
}

const toRecord = <Id extends string>(segments: readonly TimelineSegment<Id>[]): Record<Id, Span> =>
  Object.fromEntries(
    segments.map((segment) => [
      segment.id,
      { from: segment.from, durationInFrames: segment.durationInFrames },
    ]),
  ) as Record<Id, Span>;

export const computeBeforeAfterTimeline = (input: {
  durationSec: number;
  fps: number;
}): BeforeAfterTimeline => {
  const totalFrames = Math.round(input.durationSec * input.fps);
  const segments = toRecord(
    distributeFrames(
      SEGMENTS.map((segment) => ({
        id: segment.id,
        weight: segment.weight,
        minFrames: Math.round(segment.minSec * input.fps),
      })),
      totalFrames,
    ),
  );

  const seamFrames = Math.max(
    1,
    Math.min(
      Math.round(SEAM_SEC * input.fps),
      Math.floor(segments.intro.durationInFrames / 2),
      Math.floor(segments.outro.durationInFrames / 2),
    ),
  );

  const bodyStart = segments.before.from;
  const local = (span: Span): Span => ({
    from: span.from - bodyStart,
    durationInFrames: span.durationInFrames,
  });
  const bodyVisible = segments.outro.from - bodyStart;

  return {
    totalFrames,
    seamFrames,
    segments,
    // Intro and body are extended by one seam so that, after the overlaps, every
    // scene is fully visible for exactly its segment duration.
    sequences: {
      intro: segments.intro.durationInFrames + seamFrames,
      body: bodyVisible + seamFrames,
      outro: segments.outro.durationInFrames,
    },
    body: {
      before: local(segments.before),
      reveal: local(segments.reveal),
      after: local(segments.after),
      finale: local(segments.finale),
    },
  };
};

/** A frame in the middle of the AFTER scene: the best single still of the video. */
export const beforeAfterPosterFrame = (input: { durationSec: number; fps: number }): number => {
  const { segments } = computeBeforeAfterTimeline(input);
  return segments.after.from + Math.floor(segments.after.durationInFrames / 2);
};
