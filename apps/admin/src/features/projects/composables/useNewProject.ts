import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { useRouter } from 'vue-router';
import { useNotify } from '@/composables/useNotify';
import { routeTo } from '@/lib/routes';
import { useTemplatesQuery } from '@/queries/catalog';
import { usePresetsQuery } from '@/queries/presets';
import { useCreateProjectMutation } from '@/queries/projects';
import type { NewProjectGroup } from '@/features/projects/types';

export interface NewProjectState {
  readonly open: Ref<boolean>;
  /** Per template: its defaults (with its default preset, if any) and its other presets. */
  readonly groups: ComputedRef<readonly NewProjectGroup[]>;
  readonly creating: ComputedRef<boolean>;
  /** `choice` is a `NewProjectChoice.value`; an empty name takes the preset's or template's. */
  readonly create: (choice: string, name: string) => Promise<void>;
}

const TEMPLATE = 'template:';
const PRESET = 'preset:';

/** "New project": pick a template or a preset, then the project opens in the editor. */
export const useNewProject = (): NewProjectState => {
  const router = useRouter();
  const notify = useNotify();
  const templates = useTemplatesQuery();
  const presets = usePresetsQuery();
  const mutation = useCreateProjectMutation();
  const open = ref(false);

  const groups = computed<NewProjectGroup[]>(() =>
    (templates.data.value ?? []).map((template) => {
      const own = (presets.data.value ?? []).filter((preset) => preset.templateId === template.id);
      const fallback = own.find((preset) => preset.isDefault);
      return {
        templateName: template.name,
        choices: [
          {
            value: `${TEMPLATE}${template.id}`,
            label: fallback
              ? `${template.name} · default (${fallback.name})`
              : `${template.name} · template defaults`,
          },
          ...own
            .filter((preset) => !preset.isDefault)
            .map((preset) => ({
              value: `${PRESET}${preset.id}`,
              label: `${template.name} · ${preset.name}`,
            })),
        ],
      };
    }),
  );

  const create = async (choice: string, name: string): Promise<void> => {
    const trimmed = name.trim();
    const source = choice.startsWith(PRESET)
      ? { presetId: choice.slice(PRESET.length) }
      : { templateId: choice.slice(TEMPLATE.length) };
    try {
      const project = await mutation.mutateAsync({ ...source, ...(trimmed ? { name: trimmed } : {}) });
      open.value = false;
      await router.push(routeTo.project(project.id));
    } catch (error) {
      notify.error('Could not create the project', error);
    }
  };

  return { open, groups, creating: computed(() => mutation.isPending.value), create };
};
