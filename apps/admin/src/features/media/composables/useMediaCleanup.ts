import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';
import { useConfirm } from '@/composables/useConfirm';
import { useNotify } from '@/composables/useNotify';
import { formatBytes } from '@/lib/format';
import type { SelectionSummary } from '@/lib/media-library';
import { useDeleteMediaMutation, useMediaCleanupMutation } from '@/queries/media';
import { CLEANUP_DEFAULT_DAYS } from '@/features/media/constants';
import type { CleanupPreview } from '@/features/media/types';

export interface MediaCleanupDeps {
  readonly selectedIds: ComputedRef<readonly string[]>;
  readonly selection: ComputedRef<SelectionSummary>;
  readonly clearSelection: () => void;
  readonly draftUsage: ComputedRef<ReadonlyMap<string, readonly string[]>>;
}

export interface MediaCleanupState {
  readonly deleting: ComputedRef<boolean>;
  readonly deleteSelected: () => Promise<void>;
  /** The "unused older than N days" dialog. */
  readonly cleanupOpen: Ref<boolean>;
  readonly cleanupDays: Ref<number>;
  /** Counted files (null until counted, or after the days change). */
  readonly cleanupPreview: Ref<CleanupPreview | null>;
  readonly cleanupBusy: ComputedRef<boolean>;
  readonly openCleanup: () => void;
  readonly checkCleanup: () => Promise<void>;
  readonly runCleanup: () => Promise<void>;
}

const files = (count: number): string => `${String(count)} file${count === 1 ? '' : 's'}`;

/** Deleting the selected files, and deleting the unused ones older than N days. */
export const useMediaCleanup = (deps: MediaCleanupDeps): MediaCleanupState => {
  const confirm = useConfirm();
  const notify = useNotify();
  const removeMany = useDeleteMediaMutation();
  const cleanup = useMediaCleanupMutation();
  const cleanupOpen = ref(false);
  const cleanupDays = ref(CLEANUP_DEFAULT_DAYS);
  const cleanupPreview = ref<CleanupPreview | null>(null);
  // A count is only valid for the days it was made for.
  watch(cleanupDays, () => {
    cleanupPreview.value = null;
  });
  // Files in the drafts are never cleaned up (drafts live in this browser, the server cannot know).
  const keepIds = (): string[] => [...deps.draftUsage.value.keys()];

  const deleteSelected = async (): Promise<void> => {
    const summary = deps.selection.value;
    if (summary.count === 0) return;
    const notes = [
      summary.inRenders > 0
        ? `${files(summary.inRenders)} used by renders: those videos stay, but re-rendering them will fail.`
        : '',
      summary.inDrafts > 0
        ? `${files(summary.inDrafts)} in a template's draft: those slots become empty.`
        : '',
    ].filter(Boolean);
    const confirmed = await confirm({
      title: `Delete ${files(summary.count)} (${formatBytes(summary.bytes)})?`,
      description: [...notes, 'This cannot be undone.'].join(' '),
      confirmLabel: 'Delete',
      tone: 'destructive',
    });
    if (!confirmed) return;
    try {
      const result = await removeMany.mutateAsync(deps.selectedIds.value);
      deps.clearSelection();
      notify.success(`Deleted ${files(result.deleted.length)}`, `${formatBytes(result.freedBytes)} freed`);
      if (result.failed.length > 0) {
        notify.warning(`${files(result.failed.length)} not deleted`, result.failed[0]?.message);
      }
    } catch (error) {
      notify.error('Could not delete the files', error);
    }
  };

  const checkCleanup = async (): Promise<void> => {
    try {
      const result = await cleanup.mutateAsync({
        olderThanDays: cleanupDays.value,
        keepIds: keepIds(),
        dryRun: true,
      });
      cleanupPreview.value = { count: result.count, sizeLabel: formatBytes(result.bytes) };
    } catch (error) {
      notify.error('Could not count the unused files', error);
    }
  };

  const runCleanup = async (): Promise<void> => {
    try {
      const result = await cleanup.mutateAsync({
        olderThanDays: cleanupDays.value,
        keepIds: keepIds(),
        dryRun: false,
      });
      deps.clearSelection();
      cleanupOpen.value = false;
      notify.success(`Deleted ${files(result.count)}`, `${formatBytes(result.bytes)} freed`);
    } catch (error) {
      notify.error('Could not delete the unused files', error);
    }
  };

  return {
    deleting: computed(() => removeMany.isPending.value),
    deleteSelected,
    cleanupOpen,
    cleanupDays,
    cleanupPreview,
    cleanupBusy: computed(() => cleanup.isPending.value),
    openCleanup: () => {
      cleanupPreview.value = null;
      cleanupOpen.value = true;
    },
    checkCleanup,
    runCleanup,
  };
};
