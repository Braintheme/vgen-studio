import type { OutputMetadata } from '../formats.js';
import type { BaseProps } from '../schema/base.js';
import type { ResolvedAssets } from '../engine/assets.js';
import type { TemplateDefinition } from '../template/definition.js';

export interface PlayerInput {
  readonly template: TemplateDefinition;
  readonly props: BaseProps;
  readonly assets: ResolvedAssets;
  readonly metadata: OutputMetadata;
}

export interface PlayerState {
  readonly frame: number;
  readonly playing: boolean;
}

export interface PlayerHandle {
  update(input: PlayerInput): void;
  play(): void;
  pause(): void;
  seekTo(frame: number): void;
  subscribe(listener: (state: PlayerState) => void): () => void;
  destroy(): void;
}

/**
 * Framework-agnostic browser preview for an engine: mounts into a DOM container.
 * `TContainer` is `HTMLElement` in the browser; kept generic so Node consumers of
 * the shared package do not need DOM typings.
 */
export interface PlayerAdapter<TContainer = unknown> {
  readonly engine: string;
  mount(container: TContainer, input: PlayerInput): PlayerHandle;
}
