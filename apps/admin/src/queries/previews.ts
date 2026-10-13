import { keepPreviousData, useQuery, type UseQueryReturnType } from '@tanstack/vue-query';
import type { CreatePreviewRequest, PreviewDto } from '@vgen/shared';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import type { ApiRequestError } from '@/api/errors';
import { previewsApi } from '@/api/previews';
import { queryKeys } from './keys';

/** A frame for given props never changes (the server caches it by content hash). */
const FRAME_STALE_TIME_MS = Number.POSITIVE_INFINITY;

/**
 * Server-rendered preview frame; disabled while `request` is null. The previous frame
 * stays visible while a new one renders.
 */
export const usePreviewFrameQuery = (
  request: MaybeRefOrGetter<CreatePreviewRequest | null>,
): UseQueryReturnType<PreviewDto, ApiRequestError> =>
  useQuery({
    queryKey: computed(() => {
      const value = toValue(request);
      return value ? queryKeys.previews.frame(value) : queryKeys.previews.all;
    }),
    queryFn: ({ signal }) => {
      const value = toValue(request);
      if (!value) throw new Error('No preview request');
      return previewsApi.create(value, { signal });
    },
    enabled: computed(() => toValue(request) !== null),
    staleTime: FRAME_STALE_TIME_MS,
    retry: false,
    placeholderData: keepPreviousData,
  });
