import type { MediaLibraryItemDto, MediaLibraryQuery } from '@vgen/shared';
import { computed, ref, shallowRef, watch, type ComputedRef, type Ref } from 'vue';
import { useDraftMediaUsage } from '@/composables/useDraftMediaUsage';
import { formatBytes } from '@/lib/format';
import { summarizeSelection, toMediaTiles, type SelectionSummary } from '@/lib/media-library';
import type { MediaTileView } from '@/lib/ui-types';
import type { ApiRequestError } from '@/queries/errors';
import { useMediaLibraryQuery } from '@/queries/media';
import { MEDIA_PAGE_SIZE } from '@/features/media/constants';
import type { LibraryKindFilter } from '@/features/media/types';

export interface MediaLibraryState {
  readonly kind: Ref<LibraryKindFilter>;
  /** In the Groups view: the open group (its files are listed); null = the group cards. */
  readonly groupId: Ref<string | null>;
  /** The Groups view shows group cards, not files. */
  readonly showsGroupCards: ComputedRef<boolean>;
  readonly sort: Ref<MediaLibraryQuery['sort']>;
  readonly page: Ref<number>;
  readonly pageSize: number;
  readonly tiles: ComputedRef<readonly MediaTileView[]>;
  readonly total: ComputedRef<number>;
  /** "109 files · 1.9 GB" for the current filter. */
  readonly totalLabel: ComputedRef<string>;
  readonly isLoading: ComputedRef<boolean>;
  readonly error: ComputedRef<ApiRequestError | null>;
  readonly retry: () => void;
  /** Media id -> templates whose drafts hold it. */
  readonly draftUsage: ComputedRef<ReadonlyMap<string, readonly string[]>>;
  readonly selectedIds: ComputedRef<readonly string[]>;
  readonly selection: ComputedRef<SelectionSummary>;
  readonly toggle: (id: string) => void;
  readonly selectPage: () => void;
  readonly clearSelection: () => void;
  /** Selects these files (e.g. just uploaded), replacing the selection. */
  readonly selectOnly: (items: readonly MediaLibraryItemDto[]) => void;
}

/** The media page's list: filters, pages, draft usage and a selection kept across pages. */
export const useMediaLibrary = (): MediaLibraryState => {
  const kind = ref<LibraryKindFilter>('all');
  const sort = ref<MediaLibraryQuery['sort']>('newest');
  const groupId = ref<string | null>(null);
  const page = ref(1);
  watch([kind, sort, groupId], () => {
    page.value = 1;
  });
  // A group is opened from the Groups view only: leaving the view closes it.
  watch(kind, (next) => {
    if (next !== 'groups') groupId.value = null;
  });
  const showsGroupCards = computed(() => kind.value === 'groups' && groupId.value === null);

  const query = useMediaLibraryQuery(
    () => ({
      page: page.value,
      pageSize: MEDIA_PAGE_SIZE,
      sort: sort.value,
      ...(kind.value === 'image' || kind.value === 'video' ? { kind: kind.value } : {}),
      ...(kind.value === 'groups' && groupId.value ? { groupId: groupId.value } : {}),
    }),
    () => !showsGroupCards.value,
  );
  const draftUsage = useDraftMediaUsage();
  // Selected files with what is needed to describe them, whatever page they are on.
  const selected = shallowRef<ReadonlyMap<string, MediaLibraryItemDto>>(new Map());
  const items = computed(() => query.data.value?.items ?? []);

  const toggle = (id: string): void => {
    const next = new Map(selected.value);
    const item = items.value.find((candidate) => candidate.id === id);
    if (next.has(id)) next.delete(id);
    else if (item) next.set(id, item);
    selected.value = next;
  };

  return {
    kind,
    groupId,
    showsGroupCards,
    sort,
    page,
    pageSize: MEDIA_PAGE_SIZE,
    tiles: computed(() => toMediaTiles(items.value, draftUsage.value, new Set(selected.value.keys()))),
    total: computed(() => query.data.value?.total ?? 0),
    totalLabel: computed(() => {
      const data = query.data.value;
      return data ? `${String(data.total)} files · ${formatBytes(data.totalBytes)}` : '';
    }),
    isLoading: computed(() => query.isLoading.value),
    error: computed(() => query.error.value),
    retry: () => {
      void query.refetch();
    },
    draftUsage,
    selectedIds: computed(() => [...selected.value.keys()]),
    selection: computed(() => summarizeSelection(selected.value.values(), draftUsage.value)),
    toggle,
    selectPage: () => {
      const next = new Map(selected.value);
      items.value.forEach((item) => next.set(item.id, item));
      selected.value = next;
    },
    clearSelection: () => {
      selected.value = new Map();
    },
    selectOnly: (next) => {
      selected.value = new Map(next.map((item) => [item.id, item]));
    },
  };
};
