import { DOWNLOADED_FILTERS, RENDER_STATUSES, type RenderDayDto, type RenderJobDto } from '@vgen/shared';
import { computed, type ComputedRef, type Ref } from 'vue';
import { useEnginesQuery, useTemplatesQuery } from '@/queries/catalog';
import type { ApiRequestError } from '@/queries/errors';
import { localTimeZone } from '@/lib/days';
import { useRenderDaysQuery, useRenderLiveSync, useRendersQuery } from '@/queries/renders';
import {
  DOWNLOADED_FILTER_LABELS,
  RENDER_STATUS_META,
  RENDERS_PAGE_SIZE_OPTIONS,
  RENDERS_POLL_INTERVAL_MS,
} from '@/features/renders/constants';
import type { RenderFilterOptions } from '@/features/renders/types';
import { useRendersFilters, type RendersFiltersState } from './useRendersFilters';

export interface RendersTableState extends Omit<RendersFiltersState, 'listQuery'> {
  readonly rows: ComputedRef<RenderJobDto[]>;
  readonly total: ComputedRef<number>;
  readonly pageSizeOptions: readonly number[];
  /** First load (no data yet). */
  readonly isLoading: ComputedRef<boolean>;
  readonly isRefreshing: ComputedRef<boolean>;
  readonly error: ComputedRef<ApiRequestError | null>;
  readonly filterOptions: ComputedRef<RenderFilterOptions>;
  /** Template id -> display name. */
  readonly templateNames: ComputedRef<ReadonlyMap<string, string>>;
  readonly liveConnected: Readonly<Ref<boolean>>;
  /** The browser's time zone: rows are grouped by its calendar days. */
  readonly timeZone: string;
  /** Day key -> counts over every page under the filters. */
  readonly days: ComputedRef<ReadonlyMap<string, RenderDayDto>>;
  readonly retry: () => void;
}

/** Data for the renders table: filtered page, live updates (SSE, polling fallback), filter options. */
export const useRendersTable = (): RendersTableState => {
  const { listQuery, ...filtersState } = useRendersFilters();
  const timeZone = localTimeZone();
  const days = useRenderDaysQuery(() => ({ ...filtersState.scope.value, tz: timeZone }));
  const live = useRenderLiveSync();
  const renders = useRendersQuery(listQuery, {
    pollInterval: () => (live.connected.value ? false : RENDERS_POLL_INTERVAL_MS),
  });
  const templates = useTemplatesQuery();
  const engines = useEnginesQuery();

  const filterOptions = computed<RenderFilterOptions>(() => ({
    statuses: RENDER_STATUSES.map((status) => ({ value: status, label: RENDER_STATUS_META[status].label })),
    templates: (templates.data.value ?? []).map((template) => ({ value: template.id, label: template.name })),
    engines: (engines.data.value ?? []).map((engine) => ({ value: engine.id, label: engine.name })),
    downloaded: DOWNLOADED_FILTERS.map((value) => ({ value, label: DOWNLOADED_FILTER_LABELS[value] })),
  }));

  return {
    ...filtersState,
    rows: computed(() => renders.data.value?.items ?? []),
    total: computed(() => renders.data.value?.total ?? 0),
    pageSizeOptions: RENDERS_PAGE_SIZE_OPTIONS,
    isLoading: computed(() => renders.isPending.value),
    isRefreshing: computed(() => renders.isFetching.value && !renders.isPending.value),
    error: computed(() => renders.error.value),
    filterOptions,
    templateNames: computed(
      () => new Map((templates.data.value ?? []).map((template) => [template.id, template.name] as const)),
    ),
    liveConnected: live.connected,
    timeZone,
    days: computed(() => new Map((days.data.value ?? []).map((day) => [day.date, day] as const))),
    retry: () => {
      void renders.refetch();
    },
  };
};
