import type { RenderDayDto, RenderJobDto, RenderReadyQuery, RenderScope } from '@vgen/shared';
import { computed, ref, shallowRef, type ComputedRef, type Ref } from 'vue';
import { useNotify } from '@/composables/useNotify';
import { dayKey } from '@/lib/days';
import { checkState, isSavable, totalBytes, type CheckState } from '@/lib/render-files';
import { useReadyRendersLoader } from '@/queries/renders';

export interface RenderSelectionDeps {
  /** Rows of the current page. */
  readonly rows: ComputedRef<readonly RenderJobDto[]>;
  /** The table's filters. */
  readonly scope: ComputedRef<RenderScope>;
  readonly timeZone: string;
  /** Day counts under the filters (all pages). */
  readonly days: ComputedRef<ReadonlyMap<string, RenderDayDto>>;
}

export interface RenderSelection {
  /** Selected renders, newest first, whatever page they are on. */
  readonly items: ComputedRef<readonly RenderJobDto[]>;
  readonly count: ComputedRef<number>;
  readonly bytes: ComputedRef<number>;
  /** Done, never downloaded renders under the filters (all pages). */
  readonly notDownloaded: ComputedRef<number>;
  /** A day or "not downloaded" is being loaded from the server. */
  readonly loading: Readonly<Ref<boolean>>;
  readonly isSelected: (id: string) => boolean;
  readonly toggle: (render: RenderJobDto) => void;
  readonly pageState: ComputedRef<CheckState>;
  readonly togglePage: () => void;
  readonly dayState: (key: string) => CheckState;
  readonly toggleDay: (key: string) => Promise<void>;
  readonly selectNotDownloaded: () => Promise<void>;
  readonly remove: (ids: Iterable<string>) => void;
  readonly clear: () => void;
}

/** The renders picked for saving: rows, whole pages, whole days or everything not downloaded. */
export const useRenderSelection = (deps: RenderSelectionDeps): RenderSelection => {
  const notify = useNotify();
  const loadReady = useReadyRendersLoader();
  const selected = shallowRef<ReadonlyMap<string, RenderJobDto>>(new Map());
  const loading = ref(false);

  const add = (renders: Iterable<RenderJobDto>): void => {
    const next = new Map(selected.value);
    for (const render of renders) if (isSavable(render)) next.set(render.id, render);
    selected.value = next;
  };

  const remove = (ids: Iterable<string>): void => {
    const next = new Map(selected.value);
    for (const id of ids) next.delete(id);
    selected.value = next;
  };

  const load = async (query: RenderReadyQuery): Promise<void> => {
    loading.value = true;
    try {
      add(await loadReady(query));
    } catch (error) {
      notify.error('Could not select the renders', error);
    } finally {
      loading.value = false;
    }
  };

  const keyOf = (render: RenderJobDto): string => dayKey(render.createdAt, deps.timeZone);

  const selectedPerDay = computed(() => {
    const counts = new Map<string, number>();
    for (const render of selected.value.values()) {
      const key = keyOf(render);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  });

  const savableRows = computed(() => deps.rows.value.filter(isSavable));

  const pageState = computed(() =>
    checkState(
      savableRows.value.filter((render) => selected.value.has(render.id)).length,
      savableRows.value.length,
    ),
  );

  const dayState = (key: string): CheckState =>
    checkState(selectedPerDay.value.get(key) ?? 0, deps.days.value.get(key)?.ready ?? 0);

  return {
    items: computed(() =>
      [...selected.value.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    ),
    count: computed(() => selected.value.size),
    bytes: computed(() => totalBytes(selected.value.values())),
    notDownloaded: computed(() =>
      [...deps.days.value.values()].reduce((sum, day) => sum + day.notDownloaded, 0),
    ),
    loading,
    isSelected: (id) => selected.value.has(id),
    toggle: (render) => {
      if (selected.value.has(render.id)) remove([render.id]);
      else add([render]);
    },
    pageState,
    togglePage: () => {
      if (pageState.value === true) remove(savableRows.value.map((render) => render.id));
      else add(savableRows.value);
    },
    dayState,
    toggleDay: async (key) => {
      if (dayState(key) === true) {
        remove([...selected.value.values()].filter((render) => keyOf(render) === key).map(({ id }) => id));
        return;
      }
      await load({ ...deps.scope.value, tz: deps.timeZone, day: key });
    },
    selectNotDownloaded: () => load({ ...deps.scope.value, downloaded: 'no', tz: deps.timeZone }),
    remove,
    clear: () => {
      selected.value = new Map();
    },
  };
};
