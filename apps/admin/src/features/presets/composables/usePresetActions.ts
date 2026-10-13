import type { StylePresetDto } from '@vgen/shared';
import type { ComputedRef } from 'vue';
import { useRouter } from 'vue-router';
import { useConfirm } from '@/composables/useConfirm';
import { useNotify } from '@/composables/useNotify';
import { usePendingIds } from '@/composables/usePendingIds';
import { usePrompt } from '@/composables/usePrompt';
import { routeTo } from '@/lib/routes';
import {
  useDeletePresetMutation,
  useSetDefaultPresetMutation,
  useUpdatePresetMutation,
} from '@/queries/presets';

export interface PresetActions {
  /** Opens the editor of the preset's template with the preset applied. */
  readonly open: (preset: StylePresetDto) => Promise<void>;
  readonly rename: (preset: StylePresetDto) => Promise<void>;
  readonly makeDefault: (preset: StylePresetDto) => Promise<void>;
  readonly remove: (preset: StylePresetDto) => Promise<void>;
  readonly busyIds: ComputedRef<ReadonlySet<string>>;
}

export const usePresetActions = (): PresetActions => {
  const router = useRouter();
  const confirm = useConfirm();
  const prompt = usePrompt();
  const notify = useNotify();
  const updateMutation = useUpdatePresetMutation();
  const defaultMutation = useSetDefaultPresetMutation();
  const deleteMutation = useDeletePresetMutation();

  return {
    open: async (preset) => {
      await router.push(routeTo.compose(preset.templateId, preset.id));
    },
    rename: async (preset) => {
      const name = await prompt({
        title: 'Rename preset',
        label: 'Preset name',
        initialValue: preset.name,
        maxLength: 256,
      });
      if (!name || name === preset.name) return;
      try {
        await updateMutation.mutateAsync({ id: preset.id, name });
      } catch (error) {
        notify.error('Could not rename the preset', error);
      }
    },
    makeDefault: async (preset) => {
      try {
        await defaultMutation.mutateAsync(preset.id);
        notify.success('Default preset changed', `New videos of this template start with ${preset.name}.`);
      } catch (error) {
        notify.error('Could not change the default preset', error);
      }
    },
    remove: async (preset) => {
      const confirmed = await confirm({
        title: 'Delete this preset?',
        description: `"${preset.name}" will be deleted. Rendered videos are not affected.`,
        confirmLabel: 'Delete',
        tone: 'destructive',
      });
      if (!confirmed) return;
      try {
        await deleteMutation.mutateAsync(preset.id);
        notify.success('Preset deleted');
      } catch (error) {
        notify.error('Could not delete the preset', error);
      }
    },
    busyIds: usePendingIds(updateMutation, defaultMutation, deleteMutation),
  };
};
