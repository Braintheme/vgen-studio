import { watchDebounced } from '@vueuse/core';
import type { QualityPreset, TemplateDefinition } from '@vgen/shared';
import { computed, type ComputedRef, type ShallowRef, type WritableComputedRef } from 'vue';
import { useRoute } from 'vue-router';
import { useCollapsedSections } from '@/composables/useCollapsedSections';
import { useGroupedNotice } from '@/composables/useGroupedNotice';
import { findTemplateDefinition } from '@/engines/catalog';
import type { PlayerAdapter } from '@/engines/players';
import { visibleSections, type FormSectionSpec } from '@/lib/schema-form';
import { ROUTE_PARAMS } from '@/lib/routes';
import { cloneJson } from '@/lib/utils';
import { COLLAPSED_SCOPE, DRAFT_NOTICE_TITLE, DRAFT_SAVE_DEBOUNCE_MS } from '@/features/compose/constants';
import type { OutputSummary, PosterPreviewView, VideoRangeSource } from '@/features/compose/types';
import { useComposeDraft } from './useComposeDraft';
import { useComposeForm } from './useComposeForm';
import { useComposeMusic, type ComposeMusicState } from './useComposeMusic';
import { useComposePresets, type ComposePresetsState } from './useComposePresets';
import { useComposePreview } from './useComposePreview';
import { useComposeVideoRanges } from './useComposeVideoRanges';
import { useGenerateRender } from './useGenerateRender';
import { useMediaPicker, type MediaPickerState } from './useMediaPicker';
import { useMediaSlots, type MediaSlotsState } from './useMediaSlots';
import { usePlayerAdapter } from './usePlayerAdapter';
import { usePosterPreview } from './usePosterPreview';
import { useValidSettings } from './useValidSettings';

export interface ComposeScreenReady {
  readonly status: 'ready';
  readonly template: TemplateDefinition;
  /** Form sections for the current values (groups of unused options are hidden). */
  readonly sections: ComputedRef<readonly FormSectionSpec[]>;
  /** Folded form sections, remembered per template. */
  readonly collapsedSections: WritableComputedRef<readonly string[]>;
  readonly media: Omit<MediaSlotsState, 'validate' | 'assets'>;
  /** "From library" for photo / video slots. */
  readonly picker: MediaPickerState;
  readonly presets: ComposePresetsState;
  readonly music: Omit<ComposeMusicState, 'previewAudio'>;
  /** The video each `video-range` field trims, by field path. */
  readonly videoSources: ComputedRef<Readonly<Record<string, VideoRangeSource | null>>>;
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
  // Templates may derive the length from their content (e.g. a clip plus screenshots).
  const videoSec = computed(() => {
    const metadata = template.resolveMetadata({ ...settings.value, media: draft.media.value });
    return metadata.durationInFrames / metadata.fps;
  });
  const { previewAudio, ...music } = useComposeMusic({
    values: form.values,
    videoSec,
    setFieldValue: form.setFieldValue,
    report: reportDraftFix,
  });
  const {
    validate: validateMedia,
    assets,
    ...media
  } = useMediaSlots(template, draft.media, draft.setMedia, reportDraftFix);
  const picker = useMediaPicker(template, draft.media, media.pick);
  const videoRanges = useComposeVideoRanges({
    template,
    sections: form.sections,
    values: form.values,
    setFieldValue: form.setFieldValue,
    media: draft.media,
    assets,
  });
  const preview = useComposePreview({
    template,
    settings,
    media: draft.media,
    assets,
    music: previewAudio,
    tracks: music.tracks,
  });
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
    sections: computed(() => visibleSections(form.sections, form.values)),
    collapsedSections: useCollapsedSections(`${COLLAPSED_SCOPE}:${template.id}`),
    media,
    picker,
    presets,
    music,
    videoSources: videoRanges.sources,
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
