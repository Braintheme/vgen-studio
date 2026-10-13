import { RenderStatusSchema, type RenderListQuery } from '@vgen/shared';
import { computed, type ComputedRef, type WritableComputedRef } from 'vue';
import { useRoute, useRouter, type LocationQuery, type LocationQueryValue } from 'vue-router';
import { RENDERS_PAGE_SIZE, RENDERS_QUERY_PARAMS as PARAMS } from '@/features/renders/constants';
import { EMPTY_RENDER_FILTERS, hasActiveFilters, type RenderFilters } from '@/features/renders/types';

export interface RendersFiltersState {
  readonly filters: WritableComputedRef<RenderFilters>;
  readonly page: WritableComputedRef<number>;
  readonly hasFilters: ComputedRef<boolean>;
  /** The API query for the current filters and page. */
  readonly listQuery: ComputedRef<RenderListQuery>;
  readonly resetFilters: () => void;
}

const first = (value: LocationQueryValue | LocationQueryValue[] | undefined): string | null =>
  (Array.isArray(value) ? value[0] : value) ?? null;

const parseFilters = (query: LocationQuery): RenderFilters => {
  const status = RenderStatusSchema.safeParse(first(query[PARAMS.status]));
  return {
    status: status.success ? status.data : null,
    templateId: first(query[PARAMS.template]),
    engine: first(query[PARAMS.engine]),
  };
};

const parsePage = (query: LocationQuery): number => {
  const page = Number(first(query[PARAMS.page]));
  return Number.isInteger(page) && page > 0 ? page : 1;
};

/** Renders table filters and page, kept in the URL query. */
export const useRendersFilters = (): RendersFiltersState => {
  const route = useRoute();
  const router = useRouter();

  const write = (filters: RenderFilters, page: number): void => {
    void router.replace({
      query: {
        ...(filters.status ? { [PARAMS.status]: filters.status } : {}),
        ...(filters.templateId ? { [PARAMS.template]: filters.templateId } : {}),
        ...(filters.engine ? { [PARAMS.engine]: filters.engine } : {}),
        ...(page > 1 ? { [PARAMS.page]: String(page) } : {}),
      },
    });
  };

  const filters = computed<RenderFilters>({
    get: () => parseFilters(route.query),
    // Changing a filter starts over from the first page.
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

  const hasFilters = computed(() => hasActiveFilters(filters.value));

  const listQuery = computed<RenderListQuery>(() => ({
    page: page.value,
    pageSize: RENDERS_PAGE_SIZE,
    ...(filters.value.status ? { status: filters.value.status } : {}),
    ...(filters.value.templateId ? { templateId: filters.value.templateId } : {}),
    ...(filters.value.engine ? { engine: filters.value.engine } : {}),
  }));

  return {
    filters,
    page,
    hasFilters,
    listQuery,
    resetFilters: () => {
      filters.value = EMPTY_RENDER_FILTERS;
    },
  };
};
