import {
  applyPreset,
  extractPresetProps,
  isDeepEqual,
  sanitizeTemplateSettings,
  type StylePresetDto,
  type TemplateDefinition,
} from '@vgen/shared';
import { computed, ref, watch, type ComputedRef, type Ref, type WritableComputedRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useNotify } from '@/composables/useNotify';
import { usePrompt } from '@/composables/usePrompt';
import { ROUTE_QUERY } from '@/lib/routes';
import { cloneJson } from '@/lib/utils';
import { useCreatePresetMutation, usePresetsQuery, useUpdatePresetMutation } from '@/queries/presets';
import type { SettingsValues, TemplateSettings } from './useComposeForm';

export interface ComposePresetsDeps {
  readonly template: TemplateDefinition;
  /** Reactive form values. */
  readonly values: Readonly<SettingsValues>;
  /** Last valid settings (what the preview shows). */
  readonly settings: Readonly<Ref<TemplateSettings>>;
  readonly replaceValues: (values: SettingsValues) => void;
  readonly presetId: WritableComputedRef<string | null>;
  /** A new draft starts from the template's default preset. */
  readonly isFresh: boolean;
}

export interface ComposePresetsState {
  readonly presets: ComputedRef<readonly StylePresetDto[]>;
  readonly selectedId: ComputedRef<string | null>;
  /** The style differs from the selected preset. */
  readonly modified: ComputedRef<boolean>;
  readonly busy: ComputedRef<boolean>;
  /** Applies a preset's style (content stays); `null` only detaches from the preset. */
  readonly select: (id: string | null) => void;
  readonly saveAsNew: () => Promise<void>;
  readonly updateSelected: () => Promise<void>;
}

const styleOf = (template: TemplateDefinition, props: unknown): unknown =>
  extractPresetProps(template, sanitizeTemplateSettings(template, props).value);

/**
 * Style presets on the compose screen: apply, save the current style as a new preset,
 * or overwrite the selected one. A `?preset=<id>` link or (for a new draft) the
 * template's default preset is applied once the list loads.
 */
export const useComposePresets = (deps: ComposePresetsDeps): ComposePresetsState => {
  const { template } = deps;
  const route = useRoute();
  const router = useRouter();
  const notify = useNotify();
  const prompt = usePrompt();
  const query = usePresetsQuery(template.id);
  const createMutation = useCreatePresetMutation();
  const updateMutation = useUpdatePresetMutation();

  const presets = computed<readonly StylePresetDto[]>(() => query.data.value ?? []);
  const selected = computed(() => presets.value.find((preset) => preset.id === deps.presetId.value) ?? null);

  const apply = (preset: StylePresetDto): void => {
    // Presets of an older template version are validated like drafts: bad fields reset.
    const merged = applyPreset(template, preset.props, cloneJson(deps.values));
    deps.replaceValues(sanitizeTemplateSettings(template, merged).value);
    deps.presetId.value = preset.id;
  };

  const requested = route.query[ROUTE_QUERY.preset];
  const pending = ref<string | null>(typeof requested === 'string' ? requested : null);
  const autoApplyDefault = ref(deps.isFresh);
  watch(
    presets,
    (list) => {
      if (query.isPending.value) return;
      const wanted = pending.value
        ? list.find((preset) => preset.id === pending.value)
        : autoApplyDefault.value
          ? list.find((preset) => preset.isDefault)
          : undefined;
      if (pending.value) {
        if (!wanted) notify.info('Preset not found', 'It may have been deleted; your settings were kept.');
        void router.replace({ query: {} });
      }
      if (wanted) apply(wanted);
      pending.value = null;
      autoApplyDefault.value = false;
    },
    { immediate: true },
  );

  // A preset that no longer exists is forgotten silently.
  watch(
    () =>
      deps.presetId.value !== null &&
      query.isSuccess.value &&
      !query.isFetching.value &&
      selected.value === null,
    (missing) => {
      if (missing) deps.presetId.value = null;
    },
    { immediate: true },
  );

  const modified = computed(
    () =>
      selected.value !== null &&
      !isDeepEqual(styleOf(template, deps.settings.value), styleOf(template, selected.value.props)),
  );

  return {
    presets,
    selectedId: computed(() => selected.value?.id ?? null),
    modified,
    busy: computed(() => createMutation.isPending.value || updateMutation.isPending.value),
    select: (id) => {
      const preset = presets.value.find((candidate) => candidate.id === id);
      if (preset) apply(preset);
      else deps.presetId.value = null;
    },
    saveAsNew: async () => {
      const name = await prompt({
        title: 'Save style as preset',
        description:
          'Saves format, timing, style, photo processing and music settings. Texts and photos are not saved.',
        label: 'Preset name',
        initialValue: selected.value ? `${selected.value.name} copy` : '',
        confirmLabel: 'Save preset',
        maxLength: 256,
      });
      if (!name) return;
      try {
        const preset = await createMutation.mutateAsync({
          name,
          templateId: template.id,
          props: cloneJson(deps.settings.value),
        });
        deps.presetId.value = preset.id;
        notify.success(
          'Preset saved',
          preset.isDefault ? `${preset.name} is the default for this template.` : preset.name,
        );
      } catch (error) {
        notify.error('Could not save the preset', error);
      }
    },
    updateSelected: async () => {
      const preset = selected.value;
      if (!preset) return;
      try {
        await updateMutation.mutateAsync({
          id: preset.id,
          props: cloneJson(deps.settings.value),
        });
        notify.success('Preset updated', preset.name);
      } catch (error) {
        notify.error('Could not update the preset', error);
      }
    },
  };
};
