import { onMounted, shallowRef, type ShallowRef } from 'vue';
import { loadPlayerAdapter, type PlayerAdapter } from '@/engines/players';

export interface PlayerAdapterState {
  /** `null` while loading, or when the engine has no browser player. */
  readonly adapter: ShallowRef<PlayerAdapter<HTMLElement> | null>;
  readonly unavailable: ShallowRef<boolean>;
}

/** Lazily loads an engine's preview player (its runtime is split into its own chunk). */
export const usePlayerAdapter = (engineId: string): PlayerAdapterState => {
  const adapter = shallowRef<PlayerAdapter<HTMLElement> | null>(null);
  const unavailable = shallowRef(false);
  onMounted(async () => {
    try {
      adapter.value = await loadPlayerAdapter(engineId);
      unavailable.value = adapter.value === null;
    } catch {
      unavailable.value = true;
    }
  });
  return { adapter, unavailable };
};
