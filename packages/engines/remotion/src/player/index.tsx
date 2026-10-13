// Browser player adapter of the Remotion engine (a React island mounted by any host UI).
import type { PlayerRef } from '@remotion/player';
import type { PlayerAdapter, PlayerHandle, PlayerInput, PlayerState } from '@vgen/shared';
import { createRoot } from 'react-dom/client';
import { PreviewPlayer } from './PreviewPlayer.js';

export const remotionPlayerAdapter: PlayerAdapter<HTMLElement> = {
  engine: 'remotion',

  mount(container: HTMLElement, initial: PlayerInput): PlayerHandle {
    const root = createRoot(container);
    const listeners = new Set<(state: PlayerState) => void>();
    let player: PlayerRef | null = null;
    // Stable callbacks: the player effect must not re-run on every input update.
    const onReady = (ready: PlayerRef): void => {
      player = ready;
    };
    const onState = (state: PlayerState): void => {
      listeners.forEach((listener) => {
        listener(state);
      });
    };
    const render = (input: PlayerInput): void => {
      root.render(<PreviewPlayer input={input} onReady={onReady} onState={onState} />);
    };
    render(initial);

    return {
      update: render,
      play: () => player?.play(),
      pause: () => player?.pause(),
      seekTo: (frame) => player?.seekTo(frame),
      subscribe: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
      destroy: () => {
        listeners.clear();
        player = null;
        root.unmount();
      },
    };
  },
};
