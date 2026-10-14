import {
  valueAtPath,
  type BaseProps,
  type MediaAssetDto,
  type MediaSlot,
  type MusicTrackDto,
  type PlayerInput,
  type ResolvedAudio,
  type ResolvedImage,
  type ResolvedMedia,
  type ResolvedMediaItem,
  type ResolvedVideo,
  type TemplateDefinition,
} from '@vgen/shared';
import { computed, type ComputedRef, type Ref } from 'vue';
import type { DraftMedia } from '@/stores/compose-draft';
import type { OutputSummary } from '@/features/compose/types';
import type { TemplateSettings } from './useComposeForm';

export interface ComposePreviewState {
  readonly input: ComputedRef<PlayerInput>;
  readonly summary: ComputedRef<OutputSummary>;
}

const toResolvedImage = (asset: MediaAssetDto): ResolvedImage => ({
  kind: 'image',
  // The ~1600 px preview keeps the browser fast; framing is identical to the original.
  src: asset.previewUrl ?? asset.url,
  width: asset.width ?? 0,
  height: asset.height ?? 0,
});

/** The whole video (light proxy), played from the chosen fragment's start. */
const toResolvedVideo = (
  asset: MediaAssetDto,
  slot: MediaSlot,
  settings: TemplateSettings,
): ResolvedVideo => {
  const range = (slot.range ? valueAtPath(settings, slot.range) : null) as { startSec?: unknown } | null;
  return {
    kind: 'video',
    src: asset.video?.proxyUrl ?? asset.url,
    width: asset.width ?? 0,
    height: asset.height ?? 0,
    durationSec: asset.durationSec ?? 0,
    startSec: typeof range?.startSec === 'number' ? range.startSec : 0,
    hasAudio: asset.video?.hasAudio ?? false,
  };
};

export interface ComposePreviewDeps {
  readonly template: TemplateDefinition;
  /** Last valid settings (see useValidSettings). */
  readonly settings: Readonly<Ref<TemplateSettings>>;
  readonly media: ComputedRef<DraftMedia>;
  readonly assets: ComputedRef<ReadonlyMap<string, MediaAssetDto>>;
  readonly music: ComputedRef<ResolvedAudio | null>;
  /** Library tracks, for the template's sound cues. */
  readonly tracks: ComputedRef<readonly MusicTrackDto[]>;
}

/** Player input for the live preview: settings, resolved photos and the music track. */
export const useComposePreview = ({
  template,
  settings,
  media,
  assets,
  music,
  tracks,
}: ComposePreviewDeps): ComposePreviewState => {
  const input = computed<PlayerInput>(() => {
    const props: BaseProps = { ...settings.value, media: media.value };
    const resolvedMedia: Record<string, ResolvedMedia[string]> = {};
    for (const slot of template.mediaSlots) {
      const resolve = (id: string): ResolvedMediaItem | null => {
        const asset = assets.value.get(id);
        if (!asset) return null;
        return slot.kind === 'video' ? toResolvedVideo(asset, slot, settings.value) : toResolvedImage(asset);
      };
      const value = media.value[slot.key];
      if (slot.multiple) {
        const ids = typeof value === 'string' ? [value] : [...(value ?? [])];
        resolvedMedia[slot.key] = ids.map(resolve).filter((item): item is ResolvedMediaItem => item !== null);
      } else {
        resolvedMedia[slot.key] = typeof value === 'string' ? resolve(value) : null;
      }
    }
    const sounds: Record<string, ResolvedAudio> = {};
    for (const [cue, trackId] of Object.entries(template.soundTracks?.(props) ?? {})) {
      const track = tracks.value.find((candidate) => candidate.id === trackId);
      if (track) sounds[cue] = { src: track.url, durationSec: track.durationSec };
    }
    return {
      template,
      props,
      assets: { media: resolvedMedia, music: music.value, sounds },
      metadata: template.resolveMetadata(props),
    };
  });

  const summary = computed<OutputSummary>(() => {
    const { width, height, fps, durationInFrames } = input.value.metadata;
    return { width, height, fps, durationSec: durationInFrames / fps };
  });

  return { input, summary };
};
