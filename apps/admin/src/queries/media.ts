import { useMutation, useQueries, useQueryClient, type UseMutationReturnType } from '@tanstack/vue-query';
import type { MediaAssetDto } from '@vgen/shared';
import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';
import { ApiRequestError } from '@/api/errors';
import { mediaApi } from '@/api/media';
import { queryKeys } from './keys';

/** Uploaded media never changes for a given id. */
const MEDIA_STALE_TIME_MS = Number.POSITIVE_INFINITY;

export interface MediaAssetsState {
  readonly assets: ComputedRef<ReadonlyMap<string, MediaAssetDto>>;
  /** Ids the server does not know (deleted media). */
  readonly missingIds: ComputedRef<readonly string[]>;
}

/** Media assets by id (cached individually; uploads seed the cache). */
export const useMediaAssets = (ids: MaybeRefOrGetter<readonly string[]>): MediaAssetsState => {
  const queries = useQueries({
    queries: computed(() =>
      toValue(ids).map((id) => ({
        queryKey: queryKeys.media.detail(id),
        queryFn: ({ signal }: { signal: AbortSignal }) => mediaApi.get(id, { signal }),
        staleTime: MEDIA_STALE_TIME_MS,
      })),
    ),
  });
  return {
    assets: computed(
      () =>
        new Map(
          queries.value
            .map((query) => query.data)
            .filter((asset): asset is MediaAssetDto => asset !== undefined)
            .map((asset) => [asset.id, asset] as const),
        ),
    ),
    missingIds: computed(() =>
      toValue(ids).filter((_, index) => {
        const error = queries.value[index]?.error;
        return error instanceof ApiRequestError && error.code === 'NOT_FOUND';
      }),
    ),
  };
};

export interface UploadVariables {
  readonly files: readonly File[];
  readonly onProgress?: (fraction: number) => void;
}

export const useUploadMediaMutation = (): UseMutationReturnType<
  MediaAssetDto[],
  ApiRequestError,
  UploadVariables,
  unknown
> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ files, onProgress }: UploadVariables) => mediaApi.upload(files, { onProgress }),
    onSuccess: (assets) => {
      assets.forEach((asset) => {
        client.setQueryData(queryKeys.media.detail(asset.id), asset);
      });
    },
  });
};
