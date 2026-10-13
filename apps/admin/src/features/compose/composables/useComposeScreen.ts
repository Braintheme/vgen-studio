import { watchDebounced } from '@vueuse/core';
import type { QualityPreset, TemplateDefinition } from '@vgen/shared';
import type { ComputedRef, ShallowRef, WritableComputedRef } from 'vue';
import { useRoute } from 'vue-router';
import { useGroupedNotice } from '@/composables/useGroupedNotice';
import { findTemplateDefinition } from '@/engines/catalog';
import type { PlayerAdapter } from '@/engines/players';
import type { FormSectionSpec } from '@/lib/schema-form';
import { ROUTE_PARAMS } from '@/lib/routes';
import { cloneJson } from '@/lib/utils';
import { DRAFT_NOTICE_TITLE, DRAFT_SAVE_DEBOUNCE_MS } from '@/features/compose/constants';
import type { OutputSummary, PosterPreviewView } from '@/features/compose/types';
import { useComposeDraft } from './useComposeDraft';
import { useComposeForm } from './useComposeForm';
import { useComposeMusic, type ComposeMusicState } from './useComposeMusic';
import { useComposePresets, type ComposePresetsState } from './useComposePresets';
import { useComposePreview } from './useComposePreview';
import { useGenerateRender } from './useGenerateRender';
import { useMediaSlots, type MediaSlotsState } from './useMediaSlots';
import { usePlayerAdapter } from './usePlayerAdapter';
import { usePosterPreview } from './usePosterPreview';
import { useValidSettings } from './useValidSettings';

export interface ComposeScreenReady {
  readonly status: 'ready';
  readonly template: TemplateDefinition;
  readonly sections: readonly FormSectionSpec[];
  readonly media: Omit<MediaSlotsState, 'validate' | 'assets'>;
  readonly presets: ComposePresetsState;
  readonly music: Omit<ComposeMusicState, 'previewAudio'>;
  readonly player: ShallowRef<PlayerAdapter<HTMLElement> | null>;
  readonly playerUnavailable: ShallowRef<boolean>;
  readonly preview: ReturnType<typeof useComposePreview>['input'];
  readonly summary: ComputedRef<OutputSummary>;
  readonly poster: ComputedRef<PosterPreviewView>;
  readonly quality: WritableComputedRef<QualityPreset>;
  readonly generate: () => Promise<void>;
  readonly generating: ComputedRef<boolean>;
}

export interface ComposeScreenMissing {
  readonly status: 'missing';
  readonly templateId: string;
}

export type ComposeScreen = ComposeScreenReady | ComposeScreenMissing;

/**
 * The "Create video" screen, built entirely from the template definition: draft,
 * schema form, media slots, live preview and generation.
 */
export const useComposeScreen = (): ComposeScreen => {
  const route = useRoute();
  const raw = route.params[ROUTE_PARAMS.templateId];
  const templateId = (Array.isArray(raw) ? raw[0] : raw) ?? '';
  const template = findTemplateDefinition(templateId);
  if (!template) return { status: 'missing', templateId };

  // Everything fixed automatically in a stored draft is listed in one toast.
  const reportDraftFix = useGroupedNotice(DRAFT_NOTICE_TITLE);
  const draft = useComposeDraft(template, reportDraftFix);
  const form = useComposeForm(template, draft.initialSettings);
  watchDebounced(
    () => form.values,
    (values) => {
      draft.saveSettings(cloneJson(values));
    },
    { debounce: DRAFT_SAVE_DEBOUNCE_MS, deep: true },
  );

  const settings = useValidSettings(template, form.values);
  const presets = useComposePresets({
    template,
    values: form.values,
    settings,
    replaceValues: form.replaceValues,
    presetId: draft.presetId,
    isFresh: draft.isFresh,
  });
  const { previewAudio, ...music } = useComposeMusic({
    values: form.values,
    settings,
    setFieldValue: form.setFieldValue,
    report: reportDraftFix,
  });
  const {
    validate: validateMedia,
    assets,
    ...media
  } = useMediaSlots(template, draft.media, draft.setMedia, reportDraftFix);
  const preview = useComposePreview({ template, settings, media: draft.media, assets, music: previewAudio });
  const player = usePlayerAdapter(template.engine);
  const poster = usePosterPreview({ template, input: preview.input, enabled: player.unavailable });
  const generation = useGenerateRender({
    template,
    validateSettings: form.validate,
    validateMedia,
    media: draft.media,
    quality: draft.quality,
    presetId: draft.presetId,
  });

  return {
    status: 'ready',
    template,
    sections: form.sections,
    media,
    presets,
    music,
    player: player.adapter,
    playerUnavailable: player.unavailable,
    preview: preview.input,
    summary: preview.summary,
    poster,
    quality: draft.quality,
    generate: generation.generate,
    generating: generation.generating,
  };
};
