import {
  DEFAULT_STILL_SCALE,
  sanitizeMediaRefs,
  sanitizeTemplateSettings,
  type QualityPreset,
  type StillScale,
  type TemplateDefinition,
} from '@vgen/shared';
import { computed, type ComputedRef, type WritableComputedRef } from 'vue';
import { useComposeDraftStore, type DraftMedia } from '@/stores/compose-draft';

export interface ComposeDraftState {
  /** Form start values: the saved draft, validated against the current template schema. */
  readonly initialSettings: Readonly<Record<string, unknown>>;
  /** True when no draft existed (the default preset may be applied). */
  readonly isFresh: boolean;
  readonly media: ComputedRef<DraftMedia>;
  readonly quality: WritableComputedRef<QualityPreset>;
  /** Image templates: 1× or 2× the format's size. */
  readonly scale: WritableComputedRef<StillScale>;
  readonly presetId: WritableComputedRef<string | null>;
  readonly saveSettings: (settings: Readonly<Record<string, unknown>>) => void;
  readonly setMedia: (media: DraftMedia) => void;
}

/**
 * The persisted draft of one template (local state only). On load it is validated
 * against the CURRENT template: invalid fields fall back to defaults and malformed media
 * references are dropped, with a low-key notice instead of a broken screen.
 */
export const useComposeDraft = (
  template: TemplateDefinition,
  /** Reports what was fixed in the stored draft. */
  report: (line: string) => void,
): ComposeDraftState => {
  const store = useComposeDraftStore();
  const draft = (): ReturnType<typeof store.draftOf> => store.draftOf(template.id);
  const update = (patch: Parameters<typeof store.update>[2]): void => {
    store.update(template.id, template.version, patch);
  };

  const stored = draft();
  const settings = sanitizeTemplateSettings(template, stored?.settings);
  if (stored) {
    const media = sanitizeMediaRefs(template, stored.media);
    update({ settings: settings.value, media });
    const reset = settings.resetPaths.length > 0;
    if (stored.templateVersion !== template.version) {
      const outcome = reset ? 'settings that no longer fit were reset' : 'your settings still fit';
      report(`The template was updated (v${stored.templateVersion} → v${template.version}); ${outcome}.`);
    } else if (reset) {
      report('Settings that are no longer valid were reset to defaults.');
    }
  }

  return {
    initialSettings: settings.value,
    isFresh: stored === null,
    media: computed(() => draft()?.media ?? {}),
    quality: computed({
      get: () => draft()?.quality ?? 'social',
      set: (quality) => {
        update({ quality });
      },
    }),
    scale: computed({
      get: () => draft()?.scale ?? DEFAULT_STILL_SCALE,
      set: (scale) => {
        update({ scale });
      },
    }),
    presetId: computed({
      get: () => draft()?.presetId ?? null,
      set: (presetId) => {
        update({ presetId });
      },
    }),
    saveSettings: (next) => {
      update({ settings: next });
    },
    setMedia: (media) => {
      update({ media });
    },
  };
};
