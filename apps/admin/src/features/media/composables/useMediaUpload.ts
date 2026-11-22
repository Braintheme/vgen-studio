import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { useNotify } from '@/composables/useNotify';
import { useUploadMediaMutation } from '@/queries/media';
import type { MediaLibraryState } from './useMediaLibrary';

export interface MediaUploadState {
  /** Upload progress 0..1, or null when idle. */
  readonly progress: Readonly<Ref<number | null>>;
  readonly uploading: ComputedRef<boolean>;
  readonly upload: (files: readonly File[]) => Promise<void>;
}

/**
 * Uploads straight into the library (no template needed). The new files end up selected, so
 * "Create group" is one click away.
 */
export const useMediaUpload = (library: MediaLibraryState): MediaUploadState => {
  const notify = useNotify();
  const mutation = useUploadMediaMutation();
  const progress = ref<number | null>(null);

  return {
    progress,
    uploading: computed(() => progress.value !== null),
    upload: async (files) => {
      if (files.length === 0 || progress.value !== null) return;
      progress.value = 0;
      try {
        const assets = await mutation.mutateAsync({
          files,
          onProgress: (fraction) => {
            progress.value = fraction;
          },
        });
        library.selectOnly(
          assets.map((asset) => ({ ...asset, renderCount: 0, projectCount: 0, groupCount: 0 })),
        );
        notify.success(
          `${String(assets.length)} ${assets.length === 1 ? 'file' : 'files'} uploaded`,
          'They are selected: make a group of them from the bar below.',
        );
      } catch (error) {
        notify.error('Could not upload', error);
      } finally {
        progress.value = null;
      }
    },
  };
};
