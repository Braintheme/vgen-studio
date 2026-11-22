import type { ProjectDto } from '@vgen/shared';
import { computed, type ComputedRef } from 'vue';
import { useConfirm } from '@/composables/useConfirm';
import { useNotify } from '@/composables/useNotify';
import { useDeleteProjectsMutation, useRenderProjectsMutation } from '@/queries/projects';
import type { ProjectSelection } from './useProjectSelection';

export interface ProjectActions {
  readonly renderOne: (project: ProjectDto) => Promise<void>;
  readonly removeOne: (project: ProjectDto) => Promise<void>;
  /** Queued projects leave the selection; the ones that could not start stay. */
  readonly renderSelected: () => Promise<void>;
  readonly removeSelected: () => Promise<void>;
  readonly busy: ComputedRef<boolean>;
}

const countOf = (count: number): string => `${String(count)} ${count === 1 ? 'project' : 'projects'}`;

/** Rendering and deleting projects (one or many), with confirmation and feedback. */
export const useProjectActions = (selection: ProjectSelection): ProjectActions => {
  const confirm = useConfirm();
  const notify = useNotify();
  const renderMutation = useRenderProjectsMutation();
  const deleteMutation = useDeleteProjectsMutation();

  const render = async (projects: readonly ProjectDto[]): Promise<string[]> => {
    if (projects.length === 0) return [];
    try {
      const { queued, failed } = await renderMutation.mutateAsync(projects.map((project) => project.id));
      const names = new Map(projects.map((project) => [project.id, project.name] as const));
      if (failed.length === 0) {
        notify.success(`${countOf(queued.length)} queued for rendering`, 'Follow them here or in Renders.');
      } else {
        const reasons = failed.map(
          (failure) => `${names.get(failure.projectId) ?? 'A project'}: ${failure.message}`,
        );
        notify.warning(
          `${countOf(queued.length)} queued, ${String(failed.length)} could not start`,
          reasons.join(' · '),
        );
      }
      return queued.map((entry) => entry.projectId);
    } catch (error) {
      notify.error('Could not start the renders', error);
      return [];
    }
  };

  const remove = async (projects: readonly ProjectDto[]): Promise<string[]> => {
    if (projects.length === 0) return [];
    const only = projects.length === 1 ? projects[0] : undefined;
    const confirmed = await confirm({
      title: only ? `Delete “${only.name}”?` : `Delete ${countOf(projects.length)}?`,
      description: 'Their settings are deleted permanently. Renders made from them stay in Renders.',
      confirmLabel: 'Delete',
      tone: 'destructive',
    });
    if (!confirmed) return [];
    try {
      const { deleted } = await deleteMutation.mutateAsync(projects.map((project) => project.id));
      notify.success(`${countOf(deleted.length)} deleted`);
      return deleted;
    } catch (error) {
      notify.error('Could not delete the projects', error);
      return [];
    }
  };

  return {
    renderOne: async (project) => {
      await render([project]);
    },
    removeOne: async (project) => {
      selection.remove(await remove([project]));
    },
    renderSelected: async () => {
      selection.remove(await render(selection.items.value));
    },
    removeSelected: async () => {
      selection.remove(await remove(selection.items.value));
    },
    busy: computed(() => renderMutation.isPending.value || deleteMutation.isPending.value),
  };
};
