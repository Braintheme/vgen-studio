/**
 * Browser entry: lazy loaders of the installed engines' preview players. Engines are
 * loaded on demand (their UI runtime, e.g. React for Remotion, stays out of the host
 * bundle until a preview is shown). Adding an engine = one line here.
 */
import type { PlayerAdapter } from '@vgen/shared';

export type PlayerLoader = () => Promise<PlayerAdapter<HTMLElement>>;

export const PLAYER_LOADERS: Readonly<Record<string, PlayerLoader>> = {
  remotion: () => import('@vgen/engine-remotion/player').then((module) => module.remotionPlayerAdapter),
};
