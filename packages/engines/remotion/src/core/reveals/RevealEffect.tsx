import type React from 'react';
import { SceneRenderer, type SceneRendererProps } from '../scene/SceneRenderer.js';
import { REVEAL_EFFECTS, type RevealEffectId } from './registry.js';
import type { RevealInput } from './types.js';

export interface RevealEffectProps
  extends
    RevealInput,
    Pick<SceneRendererProps, 'renderBefore' | 'renderAfter' | 'labelFont' | 'textColor' | 'radius'> {
  readonly effect: RevealEffectId;
}

/** Renders any registered reveal effect at a given progress. */
export const RevealEffect: React.FC<RevealEffectProps> = ({ effect, ...props }) => (
  <SceneRenderer {...props} nodes={REVEAL_EFFECTS.get(effect).render(props)} />
);
