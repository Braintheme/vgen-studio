import type { TemplateDefinition } from '@vgen/shared';
import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { useDraftMediaUsage } from '@/composables/useDraftMediaUsage';
import { toMediaTiles } from '@/lib/media-library';
import type { MediaTileView } from '@/lib/ui-types';
import { useMediaLibraryQuery } from '@/queries/media';
import type { DraftMedia } from '@/stores/compose-draft';
import type { MediaPickerSlot } from '@/features/compose/types';

/** Picker pages: smaller than the media page (it is a dialog). */
const PICKER_PAGE_SIZE = 24;

export interface MediaPickerState {
  readonly open: Ref<boolean>;
  readonly slot: Ref<MediaPickerSlot | null>;
  readonly page: Ref<number>;
  readonly pageSize: number;
  readonly tiles: ComputedRef<readonly MediaTileView[]>;
  readonly total: ComputedRef<number>;
  readonly isLoading: ComputedRef<boolean>;
  readonly selectedCount: ComputedRef<number>;
  /** Whether the slot can take files from the library (photos and videos only). */
  readonly canBrowse: (slotKey: string) => boolean;
  readonly openFor: (slotKey: string) => void;
  readonly toggle: (id: string) => void;
  readonly confirm: () => void;
}

const isLibraryKind = (kind: string): kind is 'image' | 'video' => kind === 'image' || kind === 'video';

/** "From library" for a media slot: pick already uploaded photos / videos instead of uploading again. */
export const useMediaPicker = (
  template: TemplateDefinition,
  media: Readonly<Ref<DraftMedia>>,
  pick: (slotKey: string, ids: readonly string[]) => void,
): MediaPickerState => {
  const open = ref(false);
  const slot = ref<MediaPickerSlot | null>(null);
  const page = ref(1);
  const selected = ref<readonly string[]>([]);
  const draftUsage = useDraftMediaUsage();
  const query = useMediaLibraryQuery(
    () => ({
      page: page.value,
      pageSize: PICKER_PAGE_SIZE,
      sort: 'newest' as const,
      kind: slot.value?.kind ?? 'image',
    }),
    open,
  );

  return {
    open,
    slot,
    page,
    pageSize: PICKER_PAGE_SIZE,
    tiles: computed(() =>
      open.value
        ? toMediaTiles(query.data.value?.items ?? [], draftUsage.value, new Set(selected.value))
        : [],
    ),
    total: computed(() => query.data.value?.total ?? 0),
    isLoading: computed(() => query.isLoading.value),
    selectedCount: computed(() => selected.value.length),
    canBrowse: (slotKey) => {
      const definition = template.mediaSlots.find((candidate) => candidate.key === slotKey);
      return definition !== undefined && isLibraryKind(definition.kind);
    },
    openFor: (slotKey) => {
      const definition = template.mediaSlots.find((candidate) => candidate.key === slotKey);
      if (!definition || !isLibraryKind(definition.kind)) return;
      const value = media.value[slotKey];
      const used = Array.isArray(value) ? value.length : 0;
      slot.value = {
        key: slotKey,
        label: definition.label,
        kind: definition.kind,
        room: definition.multiple ? Math.max(0, definition.multiple.max - used) : 1,
      };
      selected.value = [];
      page.value = 1;
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
    confirm: () => {
      if (slot.value && selected.value.length > 0) pick(slot.value.key, selected.value);
      open.value = false;
    },
  };
};
