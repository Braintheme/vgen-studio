import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationReturnType,
  type UseQueryReturnType,
} from '@tanstack/vue-query';
import {
  isFinalRenderStatus,
  type CreateRenderRequest,
  type CreateRenderResponse,
  type DuplicateRenderResponse,
  type Paginated,
  type RenderEvent,
  type RenderJobDto,
  type RenderListQuery,
} from '@vgen/shared';
import { computed, onScopeDispose, readonly, ref, toValue, type MaybeRefOrGetter, type Ref } from 'vue';
import type { ApiRequestError } from '@/api/errors';
import { openRenderEventStream } from '@/api/events';
import { rendersApi } from '@/api/renders';
import { queryKeys } from './keys';

type RenderPage = Paginated<RenderJobDto>;

export interface RendersQueryOptions {
  /** Poll interval while live updates are unavailable; `false` disables polling. */
  readonly pollInterval?: MaybeRefOrGetter<number | false>;
}

export const useRendersQuery = (
  query: MaybeRefOrGetter<RenderListQuery>,
  options: RendersQueryOptions = {},
): UseQueryReturnType<RenderPage, ApiRequestError> =>
  useQuery({
    queryKey: computed(() => queryKeys.renders.list(toValue(query))),
    queryFn: ({ signal }) => rendersApi.list(toValue(query), { signal }),
    // Keep the current page on screen while the next one loads (no flicker on filters/paging).
    placeholderData: keepPreviousData,
    refetchInterval: computed(() => toValue(options.pollInterval) ?? false),
  });

/** Applies a render update to every cached list page and to the detail cache. */
const patchRenderCaches = (
  client: QueryClient,
  id: string,
  patch: (render: RenderJobDto) => RenderJobDto,
): void => {
  client.setQueriesData<RenderPage>({ queryKey: queryKeys.renders.lists() }, (page) =>
    page ? { ...page, items: page.items.map((render) => (render.id === id ? patch(render) : render)) } : page,
  );
  client.setQueryData<RenderJobDto>(queryKeys.renders.detail(id), (render) =>
    render ? patch(render) : render,
  );
};

const isCachedInLists = (client: QueryClient, id: string): boolean =>
  client
    .getQueriesData<RenderPage>({ queryKey: queryKeys.renders.lists() })
    .some(([, page]) => page?.items.some((render) => render.id === id) ?? false);

const applyRenderEvent = (client: QueryClient, event: RenderEvent): void => {
  if (event.type === 'progress') {
    patchRenderCaches(client, event.jobId, (render) => ({
      ...render,
      status: render.status === 'queued' ? 'rendering' : render.status,
      progress: Math.max(render.progress, event.progress),
    }));
    return;
  }
  const known = isCachedInLists(client, event.jobId);
  patchRenderCaches(client, event.jobId, (render) => ({
    ...render,
    status: event.status,
    progress: event.progress,
    error: event.error,
  }));
  // Final states carry new links (output, thumbnail); unknown jobs are new rows.
  if (isFinalRenderStatus(event.status) || !known) {
    void client.invalidateQueries({ queryKey: queryKeys.renders.lists() });
  }
};

export interface RenderLiveSync {
  /** Whether the live event stream is currently connected. */
  readonly connected: Readonly<Ref<boolean>>;
}

/**
 * Keeps cached renders in sync with server-sent events for as long as the calling
 * scope lives. Callers fall back to polling while `connected` is false.
 */
export const useRenderLiveSync = (): RenderLiveSync => {
  const client = useQueryClient();
  const connected = ref(false);
  const stream = openRenderEventStream({
    onOpen: () => {
      connected.value = true;
    },
    onError: () => {
      connected.value = false;
    },
    onEvent: (event) => {
      applyRenderEvent(client, event);
    },
  });
  onScopeDispose(() => {
    stream.close();
  });
  return { connected: readonly(connected) };
};

export const useCancelRenderMutation = (): UseMutationReturnType<
  RenderJobDto,
  ApiRequestError,
  string,
  unknown
> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rendersApi.cancel(id),
    onSuccess: (render) => {
      patchRenderCaches(client, render.id, () => render);
    },
  });
};

export const useDeleteRenderMutation = (): UseMutationReturnType<void, ApiRequestError, string, unknown> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rendersApi.remove(id),
    onSuccess: (_result, id) => {
      client.removeQueries({ queryKey: queryKeys.renders.detail(id) });
      void client.invalidateQueries({ queryKey: queryKeys.renders.lists() });
    },
  });
};

export const useDuplicateRenderMutation = (): UseMutationReturnType<
  DuplicateRenderResponse,
  ApiRequestError,
  string,
  unknown
> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rendersApi.duplicate(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.renders.lists() });
    },
  });
};

export const useCreateRenderMutation = (): UseMutationReturnType<
  CreateRenderResponse,
  ApiRequestError,
  CreateRenderRequest,
  unknown
> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateRenderRequest) => rendersApi.create(request),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.renders.lists() });
    },
  });
};
