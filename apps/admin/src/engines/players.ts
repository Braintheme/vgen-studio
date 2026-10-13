import { PLAYER_LOADERS } from '@vgen/catalog/players';
import type { PlayerAdapter } from '@vgen/shared';

export type { PlayerAdapter, PlayerHandle, PlayerInput, PlayerState } from '@vgen/shared';

/** Loads the preview player of an engine; `null` when the engine has none (thumbnail fallback). */
export const loadPlayerAdapter = async (engineId: string): Promise<PlayerAdapter<HTMLElement> | null> => {
  const loader = PLAYER_LOADERS[engineId];
  return loader ? loader() : null;
};
