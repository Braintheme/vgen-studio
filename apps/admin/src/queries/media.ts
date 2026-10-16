import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type UseMutationReturnType,
  type UseQueryReturnType,
} from '@tanstack/vue-query';
import type {
  BulkDeleteMediaResponse,
  MediaAssetDto,
  MediaCleanupRequest,
  MediaCleanupResponse,
  MediaLibraryPage,
  MediaLibraryQuery,
} from '@vgen/shared';
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

/** One page of the media library (the current page stays on screen while the next loads). */
export const useMediaLibraryQuery = (
  query: MaybeRefOrGetter<MediaLibraryQuery>,
  enabled: MaybeRefOrGetter<boolean> = true,
): UseQueryReturnType<MediaLibraryPage, ApiRequestError> =>
  useQuery({
    queryKey: computed(() => queryKeys.media.library(toValue(query))),
    queryFn: ({ signal }) => mediaApi.list(toValue(query), { signal }),
    placeholderData: keepPreviousData,
    enabled: computed(() => toValue(enabled)),
  });

/** Deleting uploads changes the library and drops the files' cached details. */
const afterDelete = (client: ReturnType<typeof useQueryClient>, ids: readonly string[]): void => {
  ids.forEach((id) => {
    client.removeQueries({ queryKey: queryKeys.media.detail(id) });
  });
  void client.invalidateQueries({ queryKey: queryKeys.media.libraryAll });
};

export const useDeleteMediaMutation = (): UseMutationReturnType<
  BulkDeleteMediaResponse,
  ApiRequestError,
  readonly string[],
  unknown
> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (ids: readonly string[]) => mediaApi.removeMany(ids),
    onSuccess: (result) => {
      afterDelete(client, result.deleted);
    },
  });
};

export const useMediaCleanupMutation = (): UseMutationReturnType<
  MediaCleanupResponse,
  ApiRequestError,
  MediaCleanupRequest,
  unknown
> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (request: MediaCleanupRequest) => mediaApi.cleanup(request),
    onSuccess: (result) => {
      if (result.deleted) void client.invalidateQueries({ queryKey: queryKeys.media.all });
    },
  });
};
