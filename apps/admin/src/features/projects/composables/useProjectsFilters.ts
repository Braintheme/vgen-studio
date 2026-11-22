import { ProjectScopeSchema, type ProjectListQuery, type ProjectScope } from '@vgen/shared';
import { computed, type ComputedRef, type WritableComputedRef } from 'vue';
import { useRoute, useRouter, type LocationQuery, type LocationQueryValue } from 'vue-router';
import { useUiStore } from '@/stores/ui';
import {
  PROJECTS_PAGE_SIZE_OPTIONS,
  PROJECTS_PAGE_SIZE_SCOPE,
  PROJECTS_QUERY_PARAMS as PARAMS,
} from '@/features/projects/constants';
import {
  EMPTY_PROJECT_FILTERS,
  hasActiveProjectFilters,
  type ProjectFilters,
} from '@/features/projects/types';

export interface ProjectsFiltersState {
  readonly filters: WritableComputedRef<ProjectFilters>;
  readonly page: WritableComputedRef<number>;
  /** Rows per page, remembered in the browser; changing it starts over from the first page. */
  readonly pageSize: WritableComputedRef<number>;
  readonly hasFilters: ComputedRef<boolean>;
  readonly listQuery: ComputedRef<ProjectListQuery>;
  /** The filters as an API scope (no page): day counts and bulk selection. */
  readonly scope: ComputedRef<ProjectScope>;
  readonly resetFilters: () => void;
}

const first = (value: LocationQueryValue | LocationQueryValue[] | undefined): string | null =>
  (Array.isArray(value) ? value[0] : value) ?? null;

const parseFilters = (query: LocationQuery): ProjectFilters => {
  const rendered = ProjectScopeSchema.shape.rendered.safeParse(first(query[PARAMS.rendered]) ?? undefined);
  return {
    templateId: first(query[PARAMS.template]),
    rendered: rendered.success ? (rendered.data ?? null) : null,
  };
};

const parsePage = (query: LocationQuery): number => {
  const page = Number(first(query[PARAMS.page]));
  return Number.isInteger(page) && page > 0 ? page : 1;
};

/** Projects table filters and page, kept in the URL query; rows per page in the browser. */
export const useProjectsFilters = (): ProjectsFiltersState => {
  const route = useRoute();
  const router = useRouter();
  const ui = useUiStore();

  const write = (filters: ProjectFilters, page: number): void => {
    void router.replace({
      query: {
        ...(filters.templateId ? { [PARAMS.template]: filters.templateId } : {}),
        ...(filters.rendered ? { [PARAMS.rendered]: filters.rendered } : {}),
        ...(page > 1 ? { [PARAMS.page]: String(page) } : {}),
      },
    });
  };

  const filters = computed<ProjectFilters>({
    get: () => parseFilters(route.query),
    set: (next) => {
      write(next, 1);
    },
  });

  const page = computed<number>({
    get: () => parsePage(route.query),
    set: (next) => {
      write(filters.value, next);
    },
  });

  const pageSize = computed<number>({
    get: () => ui.pageSizeOf(PROJECTS_PAGE_SIZE_SCOPE, PROJECTS_PAGE_SIZE_OPTIONS),
    set: (next) => {
      ui.setPageSize(PROJECTS_PAGE_SIZE_SCOPE, next);
      write(filters.value, 1);
    },
  });

  const scope = computed<ProjectScope>(() => ({
    ...(filters.value.templateId ? { templateId: filters.value.templateId } : {}),
    ...(filters.value.rendered ? { rendered: filters.value.rendered } : {}),
  }));

  return {
    filters,
    page,
    pageSize,
    hasFilters: computed(() => hasActiveProjectFilters(filters.value)),
    listQuery: computed(() => ({ page: page.value, pageSize: pageSize.value, ...scope.value })),
    scope,
    resetFilters: () => {
      filters.value = EMPTY_PROJECT_FILTERS;
    },
  };
};
