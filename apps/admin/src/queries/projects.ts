import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationReturnType,
  type UseQueryReturnType,
} from '@tanstack/vue-query';
import type {
  CreateProjectRequest,
  DeleteProjectsResponse,
  Paginated,
  ProjectDayDto,
  ProjectDaysQuery,
  ProjectDto,
  ProjectListQuery,
  ProjectNeighborsDto,
  ProjectSelectableQuery,
  RenderProjectsResponse,
  UpdateProjectRequest,
} from '@vgen/shared';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import type { ApiRequestError } from '@/api/errors';
import { projectsApi } from '@/api/projects';
import { queryKeys } from './keys';

type ProjectPage = Paginated<ProjectDto>;

/** Lists and day counts change together (created, edited, rendered, deleted projects). */
export const invalidateProjectLists = (client: QueryClient): void => {
  void client.invalidateQueries({ queryKey: queryKeys.projects.lists() });
  void client.invalidateQueries({ queryKey: queryKeys.projects.dayCounts() });
  void client.invalidateQueries({ queryKey: [...queryKeys.projects.all, 'neighbors'] });
};

/** Applies a project update to every cached list page and to its detail cache. */
export const patchProjectCaches = (
  client: QueryClient,
  matches: (project: ProjectDto) => boolean,
  patch: (project: ProjectDto) => ProjectDto,
): void => {
  client.setQueriesData<ProjectPage>({ queryKey: queryKeys.projects.lists() }, (page) =>
    page
      ? { ...page, items: page.items.map((project) => (matches(project) ? patch(project) : project)) }
      : page,
  );
  client.setQueriesData<ProjectDto>({ queryKey: queryKeys.projects.details() }, (project) =>
    project && matches(project) ? patch(project) : project,
  );
};

export const useProjectsQuery = (
  query: MaybeRefOrGetter<ProjectListQuery>,
): UseQueryReturnType<ProjectPage, ApiRequestError> =>
  useQuery({
    queryKey: computed(() => queryKeys.projects.list(toValue(query))),
    queryFn: ({ signal }) => projectsApi.list(toValue(query), { signal }),
    placeholderData: keepPreviousData,
  });

export const useProjectDaysQuery = (
  query: MaybeRefOrGetter<ProjectDaysQuery>,
): UseQueryReturnType<ProjectDayDto[], ApiRequestError> =>
  useQuery({
    queryKey: computed(() => queryKeys.projects.days(toValue(query))),
    queryFn: ({ signal }) => projectsApi.days(toValue(query), { signal }),
    placeholderData: keepPreviousData,
  });

/** Loads the projects of a scope on demand (bulk selection); always fresh. */
export const useSelectableProjectsLoader = (): ((query: ProjectSelectableQuery) => Promise<ProjectDto[]>) => {
  const client = useQueryClient();
  return (query) =>
    client.query({
      queryKey: queryKeys.projects.selectable(query),
      queryFn: ({ signal }) => projectsApi.selectable(query, { signal }),
      staleTime: 0,
    });
};

export const useProjectQuery = (
  id: MaybeRefOrGetter<string>,
): UseQueryReturnType<ProjectDto, ApiRequestError> =>
  useQuery({
    queryKey: computed(() => queryKeys.projects.detail(toValue(id))),
    queryFn: ({ signal }) => projectsApi.get(toValue(id), { signal }),
    // The editor owns the project's content while it is open: no refetch on focus over it.
    refetchOnWindowFocus: false,
  });

/** The editor's Prev / Next: the project's place in the list and its neighbours. */
export const useProjectNeighborsQuery = (
  id: MaybeRefOrGetter<string>,
): UseQueryReturnType<ProjectNeighborsDto, ApiRequestError> =>
  useQuery({
    queryKey: computed(() => queryKeys.projects.neighbors(toValue(id))),
    queryFn: ({ signal }) => projectsApi.neighbors(toValue(id), { signal }),
  });

export const useCreateProjectMutation = (): UseMutationReturnType<
  ProjectDto,
  ApiRequestError,
  CreateProjectRequest,
  unknown
> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateProjectRequest) => projectsApi.create(request),
    onSuccess: (project) => {
      client.setQueryData(queryKeys.projects.detail(project.id), project);
      invalidateProjectLists(client);
    },
  });
};

export interface UpdateProjectVariables {
  readonly id: string;
  readonly patch: UpdateProjectRequest;
}

/** Saves editor changes; the detail cache takes the server's answer, lists refresh. */
export const useUpdateProjectMutation = (): UseMutationReturnType<
  ProjectDto,
  ApiRequestError,
  UpdateProjectVariables,
  unknown
> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: UpdateProjectVariables) => projectsApi.update(id, patch),
    onSuccess: (project) => {
      client.setQueryData(queryKeys.projects.detail(project.id), project);
      void client.invalidateQueries({ queryKey: queryKeys.projects.lists() });
    },
  });
};

export interface DuplicateProjectVariables {
  readonly id: string;
  readonly name?: string;
}

export const useDuplicateProjectMutation = (): UseMutationReturnType<
  ProjectDto,
  ApiRequestError,
  DuplicateProjectVariables,
  unknown
> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: DuplicateProjectVariables) => projectsApi.duplicate(id, name),
    onSuccess: (project) => {
      client.setQueryData(queryKeys.projects.detail(project.id), project);
      invalidateProjectLists(client);
    },
  });
};

export const useDeleteProjectsMutation = (): UseMutationReturnType<
  DeleteProjectsResponse,
  ApiRequestError,
  readonly string[],
  unknown
> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (ids: readonly string[]) => projectsApi.removeMany(ids),
    onSuccess: ({ deleted }) => {
      for (const id of deleted) client.removeQueries({ queryKey: queryKeys.projects.detail(id) });
      invalidateProjectLists(client);
    },
  });
};

export const useRenderProjectsMutation = (): UseMutationReturnType<
  RenderProjectsResponse,
  ApiRequestError,
  readonly string[],
  unknown
> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (ids: readonly string[]) => projectsApi.render(ids),
    onSuccess: () => {
      invalidateProjectLists(client);
      void client.invalidateQueries({ queryKey: queryKeys.projects.details() });
      void client.invalidateQueries({ queryKey: queryKeys.renders.all });
    },
  });
};
