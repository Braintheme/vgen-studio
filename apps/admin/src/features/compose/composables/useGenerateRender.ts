import type { QualityPreset, StillScale, TemplateDefinition } from '@vgen/shared';
import { computed, type ComputedRef } from 'vue';
import { useRouter } from 'vue-router';
import { useNotify } from '@/composables/useNotify';
import { routeTo } from '@/lib/routes';
import { useCreateRenderMutation } from '@/queries/renders';
import type { DraftMedia } from '@/stores/compose-draft';
import type { TemplateSettings } from './useComposeForm';

export interface GenerateDeps {
  readonly template: TemplateDefinition;
  readonly validateSettings: () => Promise<TemplateSettings | null>;
  readonly validateMedia: () => boolean;
  readonly media: ComputedRef<DraftMedia>;
  readonly quality: ComputedRef<QualityPreset>;
  readonly scale: ComputedRef<StillScale>;
  /** Style preset the settings came from (names the output file). */
  readonly presetId: ComputedRef<string | null>;
}

export interface GenerateState {
  readonly generate: () => Promise<void>;
  readonly generating: ComputedRef<boolean>;
}

/** Validates the draft and queues a render, then shows it in the renders list. */
export const useGenerateRender = (deps: GenerateDeps): GenerateState => {
  const router = useRouter();
  const notify = useNotify();
  const create = useCreateRenderMutation();

  const generate = async (): Promise<void> => {
    const mediaValid = deps.validateMedia();
    const settings = await deps.validateSettings();
    if (!settings || !mediaValid) {
      notify.warning('Check the highlighted fields', 'Some inputs are missing or invalid.');
      return;
    }
    try {
      const render = await create.mutateAsync({
        templateId: deps.template.id,
        props: { ...settings, media: deps.media.value },
        quality: deps.quality.value,
        scale: deps.scale.value,
        presetId: deps.presetId.value,
      });
      const warnings = render.warnings.map((warning) => warning.message).join(' ');
      if (warnings) notify.warning('Render queued with warnings', warnings);
      else notify.success('Render queued', render.outputName);
      await router.push(routeTo.renders());
    } catch (error) {
      notify.error('Could not start the render', error);
    }
  };

  return { generate, generating: computed(() => create.isPending.value) };
};
