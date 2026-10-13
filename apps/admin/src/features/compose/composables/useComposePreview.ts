import {
  type BaseProps,
  type MediaAssetDto,
  type PlayerInput,
  type ResolvedAudio,
  type ResolvedImage,
  type ResolvedMedia,
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

export interface ComposePreviewDeps {
  readonly template: TemplateDefinition;
  /** Last valid settings (see useValidSettings). */
  readonly settings: Readonly<Ref<TemplateSettings>>;
  readonly media: ComputedRef<DraftMedia>;
  readonly assets: ComputedRef<ReadonlyMap<string, MediaAssetDto>>;
  readonly music: ComputedRef<ResolvedAudio | null>;
}

/** Player input for the live preview: settings, resolved photos and the music track. */
export const useComposePreview = ({
  template,
  settings,
  media,
  assets,
  music,
}: ComposePreviewDeps): ComposePreviewState => {
  const input = computed<PlayerInput>(() => {
    const props: BaseProps = { ...settings.value, media: media.value };
    const resolve = (id: string): ResolvedImage | null => {
      const asset = assets.value.get(id);
      return asset ? toResolvedImage(asset) : null;
    };
    const resolvedMedia: Record<string, ResolvedMedia[string]> = {};
    for (const slot of template.mediaSlots) {
      const value = media.value[slot.key];
      if (slot.multiple) {
        const ids = typeof value === 'string' ? [value] : [...(value ?? [])];
        resolvedMedia[slot.key] = ids.map(resolve).filter((image): image is ResolvedImage => image !== null);
      } else {
        resolvedMedia[slot.key] = typeof value === 'string' ? resolve(value) : null;
      }
    }
    return {
      template,
      props,
      assets: { media: resolvedMedia, music: music.value },
      metadata: template.resolveMetadata(props),
    };
  });

  const summary = computed<OutputSummary>(() => {
    const { width, height, fps, durationInFrames } = input.value.metadata;
    return { width, height, fps, durationSec: durationInFrames / fps };
  });

  return { input, summary };
};
