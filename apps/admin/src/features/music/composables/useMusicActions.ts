import type { MusicTrackDto } from '@vgen/shared';
import type { ComputedRef } from 'vue';
import { useConfirm } from '@/composables/useConfirm';
import { useNotify } from '@/composables/useNotify';
import { usePendingIds } from '@/composables/usePendingIds';
import { usePrompt } from '@/composables/usePrompt';
import { useDeleteTrackMutation, useRenameTrackMutation, useSetDefaultTrackMutation } from '@/queries/music';

export interface MusicActions {
  readonly rename: (track: MusicTrackDto) => Promise<void>;
  readonly makeDefault: (track: MusicTrackDto) => Promise<void>;
  readonly remove: (track: MusicTrackDto) => Promise<void>;
  readonly busyIds: ComputedRef<ReadonlySet<string>>;
}

const deleteDescription = (track: MusicTrackDto): string => {
  const base = `"${track.title}" and its audio file will be deleted. Rendered videos keep their sound.`;
  if (track.presetCount === 0) return base;
  const usage =
    track.presetCount === 1
      ? '1 style preset uses this track; it will'
      : `${String(track.presetCount)} style presets use this track; they will`;
  return `${base} ${usage} play the library default track instead.`;
};

export const useMusicActions = (): MusicActions => {
  const confirm = useConfirm();
  const prompt = usePrompt();
  const notify = useNotify();
  const renameMutation = useRenameTrackMutation();
  const defaultMutation = useSetDefaultTrackMutation();
  const deleteMutation = useDeleteTrackMutation();

  return {
    rename: async (track) => {
      const title = await prompt({ title: 'Rename track', label: 'Title', initialValue: track.title });
      if (!title || title === track.title) return;
      try {
        await renameMutation.mutateAsync({ id: track.id, title });
      } catch (error) {
        notify.error('Could not rename the track', error);
      }
    },
    makeDefault: async (track) => {
      try {
        await defaultMutation.mutateAsync(track.id);
        notify.success('Default track changed', `${track.title} is used when a video has no track selected.`);
      } catch (error) {
        notify.error('Could not change the default track', error);
      }
    },
    remove: async (track) => {
      const confirmed = await confirm({
        title: 'Delete this track?',
        description: deleteDescription(track),
        confirmLabel: 'Delete',
        tone: 'destructive',
      });
      if (!confirmed) return;
      try {
        await deleteMutation.mutateAsync(track.id);
        notify.success('Track deleted');
      } catch (error) {
        notify.error('Could not delete the track', error);
      }
    },
    busyIds: usePendingIds(renameMutation, defaultMutation, deleteMutation),
  };
};
