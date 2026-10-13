import type React from 'react';
import { AbsoluteFill } from 'remotion';
import { ease, mix, progress } from '../../../core/motion.js';
import type { RevealEffectId } from '../../../core/reveals/registry.js';
import { RevealEffect, type RevealEffectProps } from '../../../core/reveals/RevealEffect.js';
import { SceneRenderer } from '../../../core/scene/SceneRenderer.js';
import { splitCompareNodes } from '../../../core/scene/split-compare.js';

export interface FinaleProps extends Omit<RevealEffectProps, 'progress' | 'effect'> {
  readonly kind: 'split' | 'rereveal';
  readonly effect: RevealEffectId;
  /** Frame relative to the finale start. */
  readonly frame: number;
  /** Visible finale length (excluding the trailing outro seam). */
  readonly duration: number;
}

/** Final comparison: a split view, or a quick flash back to "before" and a fast re-reveal. */
export const Finale: React.FC<FinaleProps> = ({ kind, effect, frame, duration, ...reveal }) => {
  if (kind === 'split') {
    const enter = Math.max(6, Math.round(duration * 0.55));
    const position =
      frame < enter
        ? mix(1.02, 0.5, ease.outExpo(frame / enter))
        : mix(0.5, 0.4, progress(frame, enter, duration * 1.6 - enter, ease.inOutSine));
    const nodes = splitCompareNodes({ ...reveal, position, chrome: progress(frame, 0, 8, ease.outCubic) });
    return <SceneRenderer {...reveal} nodes={nodes} />;
  }

  const back = Math.max(4, Math.round(duration * 0.25));
  if (frame < back) {
    return (
      <AbsoluteFill>
        {reveal.renderAfter()}
        <AbsoluteFill style={{ opacity: progress(frame, 0, back, ease.inOutCubic) }}>
          {reveal.renderBefore()}
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }
  return (
    <RevealEffect
      {...reveal}
      effect={effect}
      progress={progress(frame, back, Math.max(8, duration - back))}
    />
  );
};
