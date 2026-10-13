import type { Layout } from '../layout.js';
import type { Registrable } from '../registry.js';
import type { SceneNode } from '../scene/spec.js';

export interface RevealInput {
  /** Linear 0..1 progress of the reveal; each effect applies its own easing. */
  readonly progress: number;
  readonly layout: Layout;
  readonly accent: string;
  readonly beforeLabel: string | null;
  readonly afterLabel: string | null;
  readonly seed: number;
}

/**
 * A before -> after reveal effect: a pure function from progress to a scene
 * description. At progress 0 the frame must show "before", at 1 only "after".
 */
export interface RevealDefinition extends Registrable {
  /**
   * Natural length of the effect, seconds: templates that let the effect set the pace use
   * it (others give the reveal a fixed slot of their own timeline).
   */
  readonly durationSec: number;
  /** Progress (0..1) from which "after" dominates the frame; templates sync labels to it. */
  readonly revealedAt: number;
  render(input: RevealInput): readonly SceneNode[];
}

export const defineReveal = <const D extends RevealDefinition>(definition: D): D => definition;
