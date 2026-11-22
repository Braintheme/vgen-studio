import { copyName, type ProjectDto } from '@vgen/shared';
import { computed, shallowRef, type ComputedRef } from 'vue';
import { useRouter } from 'vue-router';
import { useNotify } from '@/composables/useNotify';
import { routeTo } from '@/lib/routes';
import { useDuplicateProjectMutation } from '@/queries/projects';

export interface DuplicateProjectState {
  /** Name of the project being copied; null while the dialog is closed. */
  readonly sourceName: ComputedRef<string | null>;
  readonly suggestedName: ComputedRef<string>;
  readonly busy: ComputedRef<boolean>;
  readonly start: (project: ProjectDto) => void;
  readonly cancel: () => void;
  /** Makes the copy; `open` goes straight to its editor, else a toast offers to. */
  readonly confirm: (name: string, open: boolean) => Promise<void>;
}

/** "Duplicate project…": a named copy of a project's content. */
export const useDuplicateProject = (): DuplicateProjectState => {
  const router = useRouter();
  const notify = useNotify();
  const mutation = useDuplicateProjectMutation();
  const source = shallowRef<ProjectDto | null>(null);

  return {
    sourceName: computed(() => source.value?.name ?? null),
    suggestedName: computed(() => (source.value ? copyName(source.value.name) : '')),
    busy: computed(() => mutation.isPending.value),
    start: (project) => {
      source.value = project;
    },
    cancel: () => {
      source.value = null;
    },
    confirm: async (name, open) => {
      const project = source.value;
      if (!project) return;
      try {
        const copy = await mutation.mutateAsync({ id: project.id, name });
        source.value = null;
        if (open) {
          await router.push(routeTo.project(copy.id));
          return;
        }
        notify.success('Project duplicated', copy.name, {
          label: 'Open',
          onClick: () => {
            void router.push(routeTo.project(copy.id));
          },
        });
      } catch (error) {
        notify.error('Could not duplicate the project', error);
      }
    },
  };
};
