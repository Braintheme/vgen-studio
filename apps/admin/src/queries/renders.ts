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
  type RenderDayDto,
  type RenderDaysQuery,
  type RenderEvent,
  type RenderJobDto,
  type RenderListQuery,
  type RenderReadyQuery,
} from '@vgen/shared';
import { computed, onScopeDispose, readonly, ref, toValue, type MaybeRefOrGetter, type Ref } from 'vue';
import type { ApiRequestError } from '@/api/errors';
import { openRenderEventStream } from '@/api/events';
import { rendersApi } from '@/api/renders';
import { queryKeys } from './keys';
import { invalidateProjectLists, patchProjectCaches } from './projects';

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

/** Lists and day counts change together (new, finished, deleted or downloaded renders). */
const invalidateRenderLists = (client: QueryClient): void => {
  void client.invalidateQueries({ queryKey: queryKeys.renders.lists() });
  void client.invalidateQueries({ queryKey: queryKeys.renders.dayCounts() });
};

/** Render counts per calendar day under the table's filters (its day headers). */
export const useRenderDaysQuery = (
  query: MaybeRefOrGetter<RenderDaysQuery>,
): UseQueryReturnType<RenderDayDto[], ApiRequestError> =>
  useQuery({
    queryKey: computed(() => queryKeys.renders.days(toValue(query))),
    queryFn: ({ signal }) => rendersApi.days(toValue(query), { signal }),
    placeholderData: keepPreviousData,
  });

/** Loads the done renders of a scope on demand (bulk selection); always fresh. */
export const useReadyRendersLoader = (): ((query: RenderReadyQuery) => Promise<RenderJobDto[]>) => {
  const client = useQueryClient();
  return (query) =>
    client.query({
      queryKey: queryKeys.renders.ready(query),
      queryFn: ({ signal }) => rendersApi.ready(query, { signal }),
      staleTime: 0,
    });
};

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

/** A project shows its last render: keep its status and progress in step with the events. */
const applyToProjects = (client: QueryClient, event: RenderEvent): void => {
  patchProjectCaches(
    client,
    (project) => project.lastRender?.id === event.jobId,
    (project) =>
      project.lastRender
        ? {
            ...project,
            lastRender:
              event.type === 'progress'
                ? {
                    ...project.lastRender,
                    status: project.lastRender.status === 'queued' ? 'rendering' : project.lastRender.status,
                    progress: Math.max(project.lastRender.progress, event.progress),
                  }
                : {
                    ...project.lastRender,
                    status: event.status,
                    progress: event.progress,
                    error: event.error,
                  },
          }
        : project,
  );
  if (event.type !== 'progress' && isFinalRenderStatus(event.status)) invalidateProjectLists(client);
};

const applyRenderEvent = (client: QueryClient, event: RenderEvent): void => {
  applyToProjects(client, event);
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
  if (isFinalRenderStatus(event.status) || !known) invalidateRenderLists(client);
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
      invalidateRenderLists(client);
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
      invalidateRenderLists(client);
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
    onSuccess: (render) => {
      invalidateRenderLists(client);
      if (render.projectId) {
        void client.invalidateQueries({ queryKey: queryKeys.projects.detail(render.projectId) });
        invalidateProjectLists(client);
      }
    },
  });
};

/** Remembers that renders were saved: marks them at once on screen, then refreshes the counts. */
export const useMarkDownloadedMutation = (): UseMutationReturnType<
  void,
  ApiRequestError,
  readonly string[],
  unknown
> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (ids: readonly string[]) => rendersApi.markDownloaded(ids),
    onSuccess: (_result, ids) => {
      const downloadedAt = new Date().toISOString();
      for (const id of ids) patchRenderCaches(client, id, (render) => ({ ...render, downloadedAt }));
      invalidateRenderLists(client);
    },
  });
};
