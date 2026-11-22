import type { ProjectDayDto, ProjectDto, ProjectScope, ProjectSelectableQuery } from '@vgen/shared';
import { computed, ref, shallowRef, type ComputedRef, type Ref } from 'vue';
import { useNotify } from '@/composables/useNotify';
import { dayKey } from '@/lib/days';
import { checkState, type CheckState } from '@/lib/render-files';
import { useSelectableProjectsLoader } from '@/queries/projects';

export interface ProjectSelectionDeps {
  readonly rows: ComputedRef<readonly ProjectDto[]>;
  readonly scope: ComputedRef<ProjectScope>;
  readonly timeZone: string;
  readonly days: ComputedRef<ReadonlyMap<string, ProjectDayDto>>;
}

export interface ProjectSelection {
  /** Selected projects, newest first, whatever page they are on. */
  readonly items: ComputedRef<readonly ProjectDto[]>;
  readonly count: ComputedRef<number>;
  /** Not rendered yet, under the filters (all pages). */
  readonly notRendered: ComputedRef<number>;
  /** A day or "not rendered" is being loaded from the server. */
  readonly loading: Readonly<Ref<boolean>>;
  readonly isSelected: (id: string) => boolean;
  readonly toggle: (project: ProjectDto) => void;
  readonly pageState: ComputedRef<CheckState>;
  readonly togglePage: () => void;
  readonly dayState: (key: string) => CheckState;
  readonly toggleDay: (key: string) => Promise<void>;
  readonly selectNotRendered: () => Promise<void>;
  readonly remove: (ids: Iterable<string>) => void;
  readonly clear: () => void;
}

/** The projects picked for rendering or deleting: rows, pages, whole days, or all not rendered. */
export const useProjectSelection = (deps: ProjectSelectionDeps): ProjectSelection => {
  const notify = useNotify();
  const loadSelectable = useSelectableProjectsLoader();
  const selected = shallowRef<ReadonlyMap<string, ProjectDto>>(new Map());
  const loading = ref(false);

  const add = (projects: Iterable<ProjectDto>): void => {
    const next = new Map(selected.value);
    for (const project of projects) next.set(project.id, project);
    selected.value = next;
  };

  const remove = (ids: Iterable<string>): void => {
    const next = new Map(selected.value);
    for (const id of ids) next.delete(id);
    selected.value = next;
  };

  const load = async (query: ProjectSelectableQuery): Promise<void> => {
    loading.value = true;
    try {
      add(await loadSelectable(query));
    } catch (error) {
      notify.error('Could not select the projects', error);
    } finally {
      loading.value = false;
    }
  };

  const keyOf = (project: ProjectDto): string => dayKey(project.createdAt, deps.timeZone);

  const selectedPerDay = computed(() => {
    const counts = new Map<string, number>();
    for (const project of selected.value.values()) {
      const key = keyOf(project);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  });

  const pageState = computed(() =>
    checkState(
      deps.rows.value.filter((project) => selected.value.has(project.id)).length,
      deps.rows.value.length,
    ),
  );

  const dayState = (key: string): CheckState =>
    checkState(selectedPerDay.value.get(key) ?? 0, deps.days.value.get(key)?.total ?? 0);

  return {
    items: computed(() =>
      [...selected.value.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    ),
    count: computed(() => selected.value.size),
    notRendered: computed(() => [...deps.days.value.values()].reduce((sum, day) => sum + day.notRendered, 0)),
    loading,
    isSelected: (id) => selected.value.has(id),
    toggle: (project) => {
      if (selected.value.has(project.id)) remove([project.id]);
      else add([project]);
    },
    pageState,
    togglePage: () => {
      if (pageState.value === true) remove(deps.rows.value.map((project) => project.id));
      else add(deps.rows.value);
    },
    dayState,
    toggleDay: async (key) => {
      if (dayState(key) === true) {
        remove([...selected.value.values()].filter((project) => keyOf(project) === key).map(({ id }) => id));
        return;
      }
      await load({ ...deps.scope.value, tz: deps.timeZone, day: key });
    },
    selectNotRendered: () => load({ ...deps.scope.value, rendered: 'no', tz: deps.timeZone }),
    remove,
    clear: () => {
      selected.value = new Map();
    },
  };
};
