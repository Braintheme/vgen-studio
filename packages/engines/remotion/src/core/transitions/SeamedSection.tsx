import type React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import type { Layout } from '../layout.js';
import { SEAM_TRANSITIONS, type SeamTransitionId } from './registry.js';
import type { TransitionDirection, TransitionFrame } from './types.js';

/** A seam between two sections, centered on the boundary frame `at`. */
export interface Seam {
  readonly at: number;
  readonly frames: number;
  readonly transition: SeamTransitionId;
}

/** Progress (0..1) through a seam, or null outside it. */
export const seamProgress = (frame: number, seam: Seam): number | null => {
  const start = seam.at - seam.frames / 2;
  if (frame < start || frame >= start + seam.frames) return null;
  return seam.frames <= 0 ? 1 : (frame - start) / seam.frames;
};

export interface SeamedSectionProps {
  /** Nominal section range, absolute frames (`to` exclusive). */
  readonly from: number;
  readonly to: number;
  readonly enter?: Seam;
  readonly exit?: Seam;
  readonly layout: Layout;
  /**
   * CSS `transform-origin` of the transition's transforms (e.g. a zoom into a point of the
   * frame); the centre when omitted.
   */
  readonly origin?: string;
  /** Renders the section at its local frame (may be < 0 or past its length inside the seams). */
  readonly children: (localFrame: number) => React.ReactNode;
}

const transitionFrame = (
  seam: Seam,
  progress: number,
  direction: TransitionDirection,
  layout: Layout,
): TransitionFrame => SEAM_TRANSITIONS.get(seam.transition).frame({ progress, direction, layout });

/**
 * A section of a timeline whose seams are centered on its boundaries: it starts half a
 * seam early and ends half a seam late, styled by the registered transition. Unlike
 * `TransitionSeries` no content is lost: a cut-style transition switches exactly at the
 * nominal boundary. Later sections must be rendered after earlier ones (entering on top).
 */
export const SeamedSection: React.FC<SeamedSectionProps> = ({
  from,
  to,
  enter,
  exit,
  layout,
  origin,
  children,
}) => {
  const frame = useCurrentFrame();
  const start = enter ? enter.at - enter.frames / 2 : from;
  const end = exit ? exit.at + exit.frames / 2 : to;
  if (frame < start || frame >= end) return null;

  const enterProgress = enter ? seamProgress(frame, enter) : null;
  const exitProgress = exit ? seamProgress(frame, exit) : null;
  const look =
    enter && enterProgress !== null
      ? transitionFrame(enter, enterProgress, 'entering', layout)
      : exit && exitProgress !== null
        ? transitionFrame(exit, exitProgress, 'exiting', layout)
        : null;
  return (
    <AbsoluteFill style={origin && look?.style ? { ...look.style, transformOrigin: origin } : look?.style}>
      {children(frame - from)}
      {look?.overlay ? (
        <AbsoluteFill style={{ pointerEvents: 'none', ...(look.overlay as React.CSSProperties) }} />
      ) : null}
    </AbsoluteFill>
  );
};
