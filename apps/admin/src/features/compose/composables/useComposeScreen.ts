import { watchDebounced } from '@vueuse/core';
import type { ProjectDto, QualityPreset, StillScale, TemplateDefinition } from '@vgen/shared';
import { computed, type ComputedRef, type ShallowRef, type WritableComputedRef } from 'vue';
import { useRoute } from 'vue-router';
import { useCollapsedSections } from '@/composables/useCollapsedSections';
import { useGroupedNotice } from '@/composables/useGroupedNotice';
import { findTemplateDefinition } from '@/engines/catalog';
import type { PlayerAdapter } from '@/engines/players';
import { visibleSections, type FormSectionSpec } from '@/lib/schema-form';
import { ROUTE_PARAMS } from '@/lib/routes';
import { cloneJson } from '@/lib/utils';
import { COLLAPSED_SCOPE, DRAFT_NOTICE_TITLE } from '@/features/compose/constants';
import type { OutputSummary, PosterPreviewView, VideoRangeSource } from '@/features/compose/types';
import { useComposeDraft } from './useComposeDraft';
import { useProjectDraft, type ProjectSession } from './useProjectDraft';
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
  /** Image templates: slide size (1× / 2×). */
  readonly scale: WritableComputedRef<StillScale>;
  readonly generate: () => Promise<void>;
  readonly generating: ComputedRef<boolean>;
  /** The project being edited; null in the quick flow (the template's browser draft). */
  readonly project: ProjectSession | null;
}

export interface ComposeScreenMissing {
  readonly status: 'missing';
  readonly templateId: string;
}

export type ComposeTarget =
  { readonly status: 'ready'; readonly template: TemplateDefinition } | ComposeScreenMissing;

/** The quick flow's template, from `/compose/:templateId`. */
export const useComposeTarget = (): ComposeTarget => {
  const route = useRoute();
  const raw = route.params[ROUTE_PARAMS.templateId];
  const templateId = (Array.isArray(raw) ? raw[0] : raw) ?? '';
  const template = findTemplateDefinition(templateId);
  return template ? { status: 'ready', template } : { status: 'missing', templateId };
};

/**
 * The editor, built entirely from the template definition: draft, schema form, media slots,
 * live preview and generation. The draft is the template's browser draft, or `project`.
 */
export const useComposeScreen = (
  template: TemplateDefinition,
  project: ProjectDto | null,
): ComposeScreenReady => {
  // Everything fixed automatically in a stored draft is listed in one toast.
  const reportDraftFix = useGroupedNotice(DRAFT_NOTICE_TITLE);
  const projectDraft = project ? useProjectDraft(template, project, reportDraftFix) : null;
  const draft = projectDraft ?? useComposeDraft(template, reportDraftFix);
  const form = useComposeForm(template, draft.initialSettings);
  watchDebounced(
    () => form.values,
    (values) => {
      draft.saveSettings(cloneJson(values));
    },
    { debounce: draft.settingsDebounceMs, deep: true },
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
  } = useMediaSlots(template, draft.media, draft.setMedia, reportDraftFix, settings);
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
    scale: draft.scale,
    presetId: draft.presetId,
    projectId: project?.id ?? null,
    beforeQueue: draft.flush,
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
    scale: draft.scale,
    generate: generation.generate,
    generating: generation.generating,
    project: projectDraft?.session ?? null,
  };
};
