import type { MediaGroupDto } from '@vgen/shared';
import { computed, type ComputedRef } from 'vue';
import { useConfirm } from '@/composables/useConfirm';
import { useNotify } from '@/composables/useNotify';
import { usePrompt } from '@/composables/usePrompt';
import {
  useCreateMediaGroupMutation,
  useDeleteMediaGroupMutation,
  useMediaGroupsQuery,
  useUpdateMediaGroupMutation,
} from '@/queries/media-groups';
import type { MediaLibraryState } from './useMediaLibrary';

export interface MediaGroupsState {
  readonly groups: ComputedRef<readonly MediaGroupDto[]>;
  /** The group the library is filtered to, if any. */
  readonly active: ComputedRef<MediaGroupDto | null>;
  readonly busy: ComputedRef<boolean>;
  readonly loading: ComputedRef<boolean>;
  /** "3 groups" for the toolbar while the Groups view shows the cards. */
  readonly countLabel: ComputedRef<string>;
  readonly createFromSelection: () => Promise<void>;
  readonly addSelectionTo: (groupId: string) => Promise<void>;
  readonly removeSelectionFromActive: () => Promise<void>;
  readonly rename: (group: MediaGroupDto) => Promise<void>;
  readonly remove: (group: MediaGroupDto) => Promise<void>;
}

const NAME_MAX = 256;
const files = (count: number): string => `${String(count)} ${count === 1 ? 'file' : 'files'}`;

/** Media groups on the Media page: made from the selection, renamed, filled, emptied, deleted. */
export const useMediaGroups = (library: MediaLibraryState): MediaGroupsState => {
  const notify = useNotify();
  const confirm = useConfirm();
  const prompt = usePrompt();
  const query = useMediaGroupsQuery();
  const create = useCreateMediaGroupMutation();
  const update = useUpdateMediaGroupMutation();
  const destroy = useDeleteMediaGroupMutation();
  const groups = computed(() => query.data.value ?? []);

  const createFromSelection = async (): Promise<void> => {
    const ids = library.selectedIds.value;
    if (ids.length === 0) return;
    const name = await prompt({
      title: 'Create a group',
      description: `${files(ids.length)} in file-name order. Use the group to fill a slot (e.g. settings screenshots) in one go.`,
      label: 'Group name',
      confirmLabel: 'Create group',
      maxLength: NAME_MAX,
    });
    if (!name?.trim()) return;
    try {
      const group = await create.mutateAsync({ name: name.trim(), assetIds: [...ids] });
      library.clearSelection();
      notify.success(`Group “${group.name}” created`, files(group.items.length));
    } catch (error) {
      notify.error('Could not create the group', error);
    }
  };

  const addSelectionTo = async (groupId: string): Promise<void> => {
    const ids = library.selectedIds.value;
    if (ids.length === 0) return;
    try {
      const group = await update.mutateAsync({ id: groupId, patch: { addIds: [...ids] } });
      library.clearSelection();
      notify.success(`Added to “${group.name}”`, `${files(group.items.length)} in the group now`);
    } catch (error) {
      notify.error('Could not add to the group', error);
    }
  };

  const active = computed(() => groups.value.find((group) => group.id === library.groupId.value) ?? null);

  return {
    groups,
    active,
    busy: computed(() => create.isPending.value || update.isPending.value || destroy.isPending.value),
    loading: computed(() => query.isLoading.value),
    countLabel: computed(
      () => `${String(groups.value.length)} ${groups.value.length === 1 ? 'group' : 'groups'}`,
    ),
    createFromSelection,
    addSelectionTo,
    removeSelectionFromActive: async () => {
      const group = active.value;
      const ids = library.selectedIds.value;
      if (!group || ids.length === 0) return;
      try {
        await update.mutateAsync({ id: group.id, patch: { removeIds: [...ids] } });
        library.clearSelection();
        notify.success(`Removed from “${group.name}”`, 'The files stay in the library.');
      } catch (error) {
        notify.error('Could not remove from the group', error);
      }
    },
    rename: async (group) => {
      const name = await prompt({
        title: 'Rename the group',
        label: 'Group name',
        initialValue: group.name,
        confirmLabel: 'Rename',
        maxLength: NAME_MAX,
      });
      if (!name?.trim() || name.trim() === group.name) return;
      try {
        await update.mutateAsync({ id: group.id, patch: { name: name.trim() } });
      } catch (error) {
        notify.error('Could not rename the group', error);
      }
    },
    remove: async (group) => {
      const confirmed = await confirm({
        title: `Delete the group “${group.name}”?`,
        description: `Only the group goes: its ${files(group.items.length)} stay in the library.`,
        confirmLabel: 'Delete group',
        tone: 'destructive',
      });
      if (!confirmed) return;
      try {
        await destroy.mutateAsync(group.id);
        if (library.groupId.value === group.id) library.groupId.value = null;
      } catch (error) {
        notify.error('Could not delete the group', error);
      }
    },
  };
};
