import { watchDebounced } from '@vueuse/core';
import { resolveTemplateDefaults, type TemplateDefinition } from '@vgen/shared';
import { readonly, shallowRef, type Ref } from 'vue';
import { PREVIEW_DEBOUNCE_MS } from '@/features/compose/constants';
import type { SettingsValues, TemplateSettings } from './useComposeForm';

/**
 * The last form values that passed the template schema (debounced). Preview, music
 * and presets read this, so a half-typed value never breaks them.
 */
export const useValidSettings = (
  template: TemplateDefinition,
  /** Reactive form values. */
  values: Readonly<SettingsValues>,
): Readonly<Ref<TemplateSettings>> => {
  const settings = shallowRef<TemplateSettings>(resolveTemplateDefaults(template));
  const apply = (next: SettingsValues): void => {
    const parsed = template.settingsSchema.safeParse(next);
    if (parsed.success) settings.value = parsed.data;
  };
  apply(values);
  watchDebounced(() => values, apply, { debounce: PREVIEW_DEBOUNCE_MS, deep: true });
  return readonly(settings);
};
