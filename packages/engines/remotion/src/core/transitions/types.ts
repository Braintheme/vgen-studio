import type { Layout } from '../layout.js';
import type { Registrable } from '../registry.js';
import type { SceneStyle } from '../scene/spec.js';

export type TransitionDirection = 'entering' | 'exiting';

export interface TransitionInput {
  /** Linear 0..1 progress through the seam. */
  readonly progress: number;
  readonly direction: TransitionDirection;
  readonly layout: Layout;
}

export interface TransitionFrame {
  /** Applied to the wrapper of the scene. */
  readonly style?: SceneStyle;
  /** Optional full-frame layer drawn above the scene (light passes, washes). */
  readonly overlay?: SceneStyle;
}

/**
 * A scene-to-scene transition: a pure function describing how the exiting and the
 * entering scene look at a given progress. The entering scene is drawn on top.
 */
export interface SeamTransitionDefinition extends Registrable {
  frame(input: TransitionInput): TransitionFrame;
}

export const defineTransition = <const D extends SeamTransitionDefinition>(definition: D): D => definition;
