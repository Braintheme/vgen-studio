import { RENDERED_FILTERS, type ProjectDayDto, type ProjectDto } from '@vgen/shared';
import { computed, type ComputedRef, type Ref } from 'vue';
import { localTimeZone } from '@/lib/days';
import { useTemplatesQuery } from '@/queries/catalog';
import type { ApiRequestError } from '@/queries/errors';
import { usePresetsQuery } from '@/queries/presets';
import { useProjectDaysQuery, useProjectsQuery } from '@/queries/projects';
import { useRenderLiveSync } from '@/queries/renders';
import { PROJECTS_PAGE_SIZE_OPTIONS, RENDERED_FILTER_LABELS } from '@/features/projects/constants';
import type { ProjectFilterOptions } from '@/features/projects/types';
import { useProjectsFilters, type ProjectsFiltersState } from './useProjectsFilters';

export interface ProjectsTableState extends Omit<ProjectsFiltersState, 'listQuery'> {
  readonly rows: ComputedRef<ProjectDto[]>;
  readonly total: ComputedRef<number>;
  readonly pageSizeOptions: readonly number[];
  readonly isLoading: ComputedRef<boolean>;
  readonly isRefreshing: ComputedRef<boolean>;
  readonly error: ComputedRef<ApiRequestError | null>;
  readonly filterOptions: ComputedRef<ProjectFilterOptions>;
  /** Template id -> display name. */
  readonly templateNames: ComputedRef<ReadonlyMap<string, string>>;
  /** Preset id -> name. */
  readonly presetNames: ComputedRef<ReadonlyMap<string, string>>;
  readonly liveConnected: Readonly<Ref<boolean>>;
  /** The browser's time zone: rows are grouped by its calendar days. */
  readonly timeZone: string;
  /** Day key -> counts over every page under the filters. */
  readonly days: ComputedRef<ReadonlyMap<string, ProjectDayDto>>;
  readonly retry: () => void;
}

/** Data for the projects table: filtered page, day counts, names, live render status. */
export const useProjectsTable = (): ProjectsTableState => {
  const { listQuery, ...filtersState } = useProjectsFilters();
  const timeZone = localTimeZone();
  const projects = useProjectsQuery(listQuery);
  const days = useProjectDaysQuery(() => ({ ...filtersState.scope.value, tz: timeZone }));
  const templates = useTemplatesQuery();
  const presets = usePresetsQuery();
  // Render events move the projects' "Rendering 40%" / "Rendered 14:05".
  const live = useRenderLiveSync();

  return {
    ...filtersState,
    rows: computed(() => projects.data.value?.items ?? []),
    total: computed(() => projects.data.value?.total ?? 0),
    pageSizeOptions: PROJECTS_PAGE_SIZE_OPTIONS,
    isLoading: computed(() => projects.isPending.value),
    isRefreshing: computed(() => projects.isFetching.value && !projects.isPending.value),
    error: computed(() => projects.error.value),
    filterOptions: computed(() => ({
      templates: (templates.data.value ?? []).map((template) => ({
        value: template.id,
        label: template.name,
      })),
      rendered: RENDERED_FILTERS.map((value) => ({ value, label: RENDERED_FILTER_LABELS[value] })),
    })),
    templateNames: computed(
      () => new Map((templates.data.value ?? []).map((template) => [template.id, template.name] as const)),
    ),
    presetNames: computed(
      () => new Map((presets.data.value ?? []).map((preset) => [preset.id, preset.name] as const)),
    ),
    liveConnected: live.connected,
    timeZone,
    days: computed(() => new Map((days.data.value ?? []).map((day) => [day.date, day] as const))),
    retry: () => {
      void projects.refetch();
    },
  };
};
