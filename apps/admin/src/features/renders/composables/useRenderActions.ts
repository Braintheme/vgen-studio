import type { RenderJobDto } from '@vgen/shared';
import { ref, type ComputedRef, type Ref } from 'vue';
import { useConfirm } from '@/composables/useConfirm';
import { useNotify } from '@/composables/useNotify';
import { usePendingIds } from '@/composables/usePendingIds';
import {
  useCancelRenderMutation,
  useDeleteRenderMutation,
  useDuplicateRenderMutation,
} from '@/queries/renders';

export interface RenderActions {
  readonly cancel: (render: RenderJobDto) => Promise<void>;
  readonly remove: (render: RenderJobDto) => Promise<void>;
  readonly duplicate: (render: RenderJobDto) => Promise<void>;
  readonly showError: (render: RenderJobDto) => void;
  /** Render whose error is shown in the error dialog; `null` closes it. */
  readonly errorRender: Ref<RenderJobDto | null>;
  /** Renders with an action in flight (their row actions are disabled). */
  readonly busyIds: ComputedRef<ReadonlySet<string>>;
}

/** User actions on renders, with confirmation and feedback. */
export const useRenderActions = (): RenderActions => {
  const confirm = useConfirm();
  const notify = useNotify();
  const cancelMutation = useCancelRenderMutation();
  const deleteMutation = useDeleteRenderMutation();
  const duplicateMutation = useDuplicateRenderMutation();
  const errorRender = ref<RenderJobDto | null>(null);

  const busyIds = usePendingIds(cancelMutation, deleteMutation, duplicateMutation);

  const cancel = async (render: RenderJobDto): Promise<void> => {
    const confirmed = await confirm({
      title: 'Cancel this render?',
      description: `"${render.outputName}" will stop and cannot be resumed. You can re-render it later.`,
      confirmLabel: 'Cancel render',
      cancelLabel: 'Keep rendering',
      tone: 'destructive',
    });
    if (!confirmed) return;
    try {
      await cancelMutation.mutateAsync(render.id);
      notify.success('Render cancelled');
    } catch (error) {
      notify.error('Could not cancel the render', error);
    }
  };

  const remove = async (render: RenderJobDto): Promise<void> => {
    const confirmed = await confirm({
      title: 'Delete this render?',
      description: `"${render.outputName}" and its video file will be deleted permanently.`,
      confirmLabel: 'Delete',
      tone: 'destructive',
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(render.id);
      notify.success('Render deleted');
    } catch (error) {
      notify.error('Could not delete the render', error);
    }
  };

  const duplicate = async (render: RenderJobDto): Promise<void> => {
    try {
      const created = await duplicateMutation.mutateAsync(render.id);
      if (created.templateVersionChanged) {
        notify.warning(
          'Re-render queued',
          'The template changed since the original render, so the video may differ.',
        );
      } else {
        notify.success('Re-render queued');
      }
    } catch (error) {
      notify.error('Could not re-render', error);
    }
  };

  return {
    cancel,
    remove,
    duplicate,
    showError: (render) => {
      errorRender.value = render;
    },
    errorRender,
    busyIds,
  };
};
