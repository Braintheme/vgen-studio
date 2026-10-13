// Public type surface of `@vgen/engine-remotion/player`. Hosts (the Vue admin) type-check
// against this contract only, never against the React implementation; `public-check.ts`
// keeps the two in sync.
import type { PlayerAdapter } from '@vgen/shared';

export declare const remotionPlayerAdapter: PlayerAdapter<HTMLElement>;
