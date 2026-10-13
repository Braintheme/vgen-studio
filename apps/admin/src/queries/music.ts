import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationReturnType,
  type UseQueryReturnType,
} from '@tanstack/vue-query';
import type { MusicTrackDto, WaveformPeaksDto } from '@vgen/shared';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import type { ApiRequestError } from '@/api/errors';
import { mediaApi } from '@/api/media';
import { musicApi } from '@/api/music';
import { queryKeys } from './keys';

/** Peaks never change for a given file. */
const PEAKS_STALE_TIME_MS = Number.POSITIVE_INFINITY;

export const useMusicTracksQuery = (): UseQueryReturnType<MusicTrackDto[], ApiRequestError> =>
  useQuery({ queryKey: queryKeys.music.all, queryFn: ({ signal }) => musicApi.list({ signal }) });

/** Waveform peaks of an audio file; disabled while `peaksUrl` is null. */
export const useWaveformPeaksQuery = (
  peaksUrl: MaybeRefOrGetter<string | null>,
): UseQueryReturnType<WaveformPeaksDto, ApiRequestError> =>
  useQuery({
    queryKey: computed(() => queryKeys.media.peaks(toValue(peaksUrl) ?? '')),
    queryFn: ({ signal }) => mediaApi.peaks(toValue(peaksUrl) ?? '', { signal }),
    enabled: computed(() => toValue(peaksUrl) !== null),
    staleTime: PEAKS_STALE_TIME_MS,
  });

export interface AddTrackVariables {
  readonly file: File;
  readonly title: string;
  readonly onProgress?: (fraction: number) => void;
}

/** Uploads an audio file and registers it as a library track. */
export const useAddTrackMutation = (): UseMutationReturnType<
  MusicTrackDto,
  ApiRequestError,
  AddTrackVariables,
  unknown
> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, title, onProgress }: AddTrackVariables) => {
      const [asset] = await mediaApi.upload([file], { onProgress });
      if (!asset) throw new Error('Upload returned no file');
      return musicApi.create({ assetId: asset.id, title });
    },
    // Resolve only once the lists are fresh, so callers can select the new item.
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.music.all }),
  });
};

const useTrackMutation = <TVariables, TResult>(
  mutationFn: (variables: TVariables) => Promise<TResult>,
): UseMutationReturnType<TResult, ApiRequestError, TVariables, unknown> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    // Resolve only once the lists are fresh, so callers can select the new item.
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.music.all }),
  });
};

export const useRenameTrackMutation = () =>
  useTrackMutation(({ id, title }: { readonly id: string; readonly title: string }) =>
    musicApi.rename(id, { title }),
  );

export const useSetDefaultTrackMutation = () => useTrackMutation((id: string) => musicApi.setDefault(id));

export const useDeleteTrackMutation = () => useTrackMutation((id: string) => musicApi.remove(id));
