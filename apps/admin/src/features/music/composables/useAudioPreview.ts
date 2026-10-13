import { onScopeDispose, readonly, ref, type Ref } from 'vue';

export interface AudioPreview {
  /** Id of the item currently playing, or null. */
  readonly playingId: Readonly<Ref<string | null>>;
  readonly toggle: (id: string, url: string) => void;
  readonly stop: () => void;
}

/** One shared audio element: starting a track stops the previous one. */
export const useAudioPreview = (): AudioPreview => {
  const playingId = ref<string | null>(null);
  let audio: HTMLAudioElement | null = null;

  const stop = (): void => {
    audio?.pause();
    playingId.value = null;
  };

  const toggle = (id: string, url: string): void => {
    if (playingId.value === id) {
      stop();
      return;
    }
    stop();
    audio ??= new Audio();
    audio.src = url;
    audio.onended = stop;
    playingId.value = id;
    void audio.play().catch(stop);
  };

  onScopeDispose(stop);
  return { playingId: readonly(playingId), toggle, stop };
};
