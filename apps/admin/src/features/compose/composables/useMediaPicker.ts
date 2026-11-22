import type { MediaLibraryItemDto, TemplateDefinition } from '@vgen/shared';
import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { useDraftMediaUsage } from '@/composables/useDraftMediaUsage';
import { toMediaTiles, uniqueById } from '@/lib/media-library';
import { orderByName, pairOf } from '@/lib/media-pairs';
import type { MediaTileView } from '@/lib/ui-types';
import { useMediaLibraryInfiniteQuery } from '@/queries/media';
import { useMediaGroupsQuery } from '@/queries/media-groups';
import type { DraftMedia } from '@/stores/compose-draft';
import type { MediaPickerGroup, MediaPickerSlot } from '@/features/compose/types';

/** Files per "Load more" (smaller than the media page: it is a dialog). */
const PICKER_PAGE_SIZE = 24;

export interface MediaPickerState {
  readonly open: Ref<boolean>;
  readonly slot: Ref<MediaPickerSlot | null>;
  /** Tiles of every page loaded so far. */
  readonly tiles: ComputedRef<readonly MediaTileView[]>;
  readonly total: ComputedRef<number>;
  readonly hasMore: ComputedRef<boolean>;
  readonly isLoading: ComputedRef<boolean>;
  readonly isLoadingMore: ComputedRef<boolean>;
  readonly selectedCount: ComputedRef<number>;
  /** Groups for a list slot (empty for single and paired slots). */
  readonly groups: ComputedRef<readonly MediaPickerGroup[]>;
  /** Selects a group's files (of the slot's kind, as many as fit), in the group's order. */
  readonly selectGroup: (groupId: string) => void;
  /** Set when a picked group had more files than the slot can still take. */
  readonly groupNote: Readonly<Ref<string | null>>;
  /** Whether the slot can take files from the library (photos and videos only). */
  readonly canBrowse: (slotKey: string) => boolean;
  readonly openFor: (slotKey: string) => void;
  readonly toggle: (id: string) => void;
  readonly loadMore: () => void;
  readonly confirm: () => void;
}

const isLibraryKind = (kind: string): kind is 'image' | 'video' => kind === 'image' || kind === 'video';

/**
 * "From library" for a media slot: pick already uploaded photos / videos instead of uploading
 * again, page after page ("Load more"). A before / after slot takes two files: both slots fill.
 */
export const useMediaPicker = (
  template: TemplateDefinition,
  media: Readonly<Ref<DraftMedia>>,
  pick: (slotKey: string, ids: readonly string[]) => void,
): MediaPickerState => {
  const open = ref(false);
  const slot = ref<MediaPickerSlot | null>(null);
  const selected = ref<readonly string[]>([]);
  const draftUsage = useDraftMediaUsage();
  const query = useMediaLibraryInfiniteQuery(
    () => ({ pageSize: PICKER_PAGE_SIZE, sort: 'newest' as const, kind: slot.value?.kind ?? 'image' }),
    open,
  );
  const items = computed<MediaLibraryItemDto[]>(() =>
    uniqueById(query.data.value?.pages.flatMap((page) => page.items) ?? []),
  );
  // A list slot (e.g. settings screenshots) can take a whole group at once.
  const listSlot = computed(() => slot.value !== null && !slot.value.paired && slot.value.room > 1);
  const groupsQuery = useMediaGroupsQuery(() => open.value && listSlot.value);
  const groupNote = ref<string | null>(null);
  const groupFiles = (groupId: string): string[] => {
    const kind = slot.value?.kind;
    const group = groupsQuery.data.value?.find((candidate) => candidate.id === groupId);
    return group ? group.items.filter((item) => item.kind === kind).map((item) => item.id) : [];
  };

  return {
    open,
    slot,
    tiles: computed(() =>
      open.value ? toMediaTiles(items.value, draftUsage.value, new Set(selected.value)) : [],
    ),
    total: computed(() => query.data.value?.pages.at(-1)?.total ?? 0),
    hasMore: computed(() => query.hasNextPage.value),
    isLoading: computed(() => query.isLoading.value),
    isLoadingMore: computed(() => query.isFetchingNextPage.value),
    selectedCount: computed(() => selected.value.length),
    groups: computed(() =>
      listSlot.value
        ? (groupsQuery.data.value ?? [])
            .map((group) => {
              const files = group.items.filter((item) => item.kind === slot.value?.kind);
              return {
                id: group.id,
                name: group.name,
                count: files.length,
                previewUrl: files[0]?.previewUrl ?? null,
              };
            })
            .filter((group) => group.count > 0)
        : [],
    ),
    selectGroup: (groupId) => {
      const room = slot.value?.room ?? 0;
      const ids = groupFiles(groupId);
      selected.value = ids.slice(0, room);
      groupNote.value =
        ids.length > room
          ? `The slot takes ${String(room)} more: the first ${String(room)} of ${String(ids.length)} are selected.`
          : null;
    },
    groupNote,
    canBrowse: (slotKey) => {
      const definition = template.mediaSlots.find((candidate) => candidate.key === slotKey);
      return definition !== undefined && isLibraryKind(definition.kind);
    },
    openFor: (slotKey) => {
      const definition = template.mediaSlots.find((candidate) => candidate.key === slotKey);
      if (!definition || !isLibraryKind(definition.kind)) return;
      const value = media.value[slotKey];
      const used = Array.isArray(value) ? value.length : 0;
      const paired = !definition.multiple && pairOf(template.ui?.slotActions, slotKey) !== null;
      slot.value = {
        key: slotKey,
        label: definition.label,
        kind: definition.kind,
        room: definition.multiple ? Math.max(0, definition.multiple.max - used) : paired ? 2 : 1,
        paired,
      };
      selected.value = [];
      groupNote.value = null;
      open.value = true;
    },
    toggle: (id) => {
      const room = slot.value?.room ?? 0;
      if (selected.value.includes(id)) {
        selected.value = selected.value.filter((selectedId) => selectedId !== id);
      } else if (room === 1) {
        selected.value = [id];
      } else if (selected.value.length < room) {
        selected.value = [...selected.value, id];
      }
    },
    loadMore: () => {
      if (query.hasNextPage.value && !query.isFetchingNextPage.value) void query.fetchNextPage();
    },
    confirm: () => {
      const target = slot.value;
      if (target && selected.value.length > 0) {
        // A pair goes in by file name (the original before its edit); a list in picking order.
        const nameOf = (id: string): string => items.value.find((item) => item.id === id)?.originalName ?? '';
        pick(target.key, target.paired ? orderByName(selected.value, nameOf) : selected.value);
      }
      open.value = false;
    },
  };
};
