import type { MusicTrackDto } from '@vgen/shared';
import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { useNotify } from '@/composables/useNotify';
import type { ApiRequestError } from '@/queries/errors';
import { useAddTrackMutation, useMusicTracksQuery } from '@/queries/music';
import { titleFromFileName } from '@/features/music/constants';

export interface MusicLibraryState {
  readonly tracks: ComputedRef<MusicTrackDto[]>;
  readonly isLoading: ComputedRef<boolean>;
  readonly error: ComputedRef<ApiRequestError | null>;
  /** Upload progress of the current file (0..1), or null. */
  readonly uploadProgress: Readonly<Ref<number | null>>;
  readonly upload: (files: readonly File[]) => Promise<void>;
  readonly retry: () => void;
}

export const useMusicLibrary = (): MusicLibraryState => {
  const notify = useNotify();
  const query = useMusicTracksQuery();
  const addTrack = useAddTrackMutation();
  const uploadProgress = ref<number | null>(null);

  const upload = async (files: readonly File[]): Promise<void> => {
    for (const file of files) {
      uploadProgress.value = 0;
      try {
        const track = await addTrack.mutateAsync({
          file,
          title: titleFromFileName(file.name),
          onProgress: (fraction) => {
            uploadProgress.value = fraction;
          },
        });
        notify.success('Track added', track.isDefault ? `${track.title} is the default track.` : track.title);
      } catch (error) {
        notify.error(`Could not add ${file.name}`, error);
      }
    }
    uploadProgress.value = null;
  };

  return {
    tracks: computed(() => query.data.value ?? []),
    isLoading: computed(() => query.isPending.value),
    error: computed(() => query.error.value),
    uploadProgress,
    upload,
    retry: () => {
      void query.refetch();
    },
  };
};
