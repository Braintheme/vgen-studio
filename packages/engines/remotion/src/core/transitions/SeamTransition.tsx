import {
  linearTiming,
  TransitionSeries,
  type TransitionPresentationComponentProps,
} from '@remotion/transitions';
import type React from 'react';
import { AbsoluteFill } from 'remotion';
import { computeLayout } from '../layout.js';
import { SEAM_TRANSITIONS, type SeamTransitionId } from './registry.js';
import type { TransitionFrame } from './types.js';

type PresentationProps = { transition: SeamTransitionId; width: number; height: number };

/** Generic presentation: applies a registered transition's frame description. */
const RegisteredPresentation: React.FC<TransitionPresentationComponentProps<PresentationProps>> = ({
  children,
  presentationDirection,
  presentationProgress,
  passedProps,
}) => {
  const frame: TransitionFrame = SEAM_TRANSITIONS.get(passedProps.transition).frame({
    progress: presentationProgress,
    direction: presentationDirection,
    layout: computeLayout(passedProps.width, passedProps.height),
  });
  return (
    <AbsoluteFill style={frame.style}>
      {children}
      {frame.overlay ? (
        <AbsoluteFill style={{ pointerEvents: 'none', ...(frame.overlay as React.CSSProperties) }} />
      ) : null}
    </AbsoluteFill>
  );
};

/** `<TransitionSeries.Transition>` for a registered seam transition. */
export const renderSeamTransition = (
  transition: SeamTransitionId,
  durationInFrames: number,
  size: { width: number; height: number },
): React.ReactElement => (
  <TransitionSeries.Transition
    presentation={{ component: RegisteredPresentation, props: { transition, ...size } }}
    timing={linearTiming({ durationInFrames })}
  />
);
