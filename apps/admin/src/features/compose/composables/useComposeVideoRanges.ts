import { resolveTemplateDefaults, type MediaAssetDto, type TemplateDefinition } from '@vgen/shared';
import { computed, watch, type ComputedRef } from 'vue';
import type { FormSectionSpec } from '@/lib/schema-form';
import { valueAtPath } from '@/lib/utils';
import {
  clampVideoRange,
  initialVideoRange,
  isSameRange,
  type VideoRangeLimits,
  type VideoRangeValue,
} from '@/lib/video-range';
import type { DraftMedia } from '@/stores/compose-draft';
import type { VideoRangeSource } from '@/features/compose/types';
import type { SettingsValues } from './useComposeForm';

export interface ComposeVideoRangesDeps {
  readonly template: TemplateDefinition;
  readonly sections: readonly FormSectionSpec[];
  /** Reactive form values. */
  readonly values: Readonly<SettingsValues>;
  readonly setFieldValue: (path: string, value: unknown) => void;
  readonly media: ComputedRef<DraftMedia>;
  readonly assets: ComputedRef<ReadonlyMap<string, MediaAssetDto>>;
}

export interface ComposeVideoRangesState {
  /** The video each `video-range` field trims, by field path (null while its slot is empty). */
  readonly sources: ComputedRef<Readonly<Record<string, VideoRangeSource | null>>>;
}

const toSource = (asset: MediaAssetDto): VideoRangeSource => ({
  url: asset.video?.proxyUrl ?? asset.url,
  posterUrl: asset.previewUrl,
  durationSec: asset.durationSec ?? 0,
  filmstrip: asset.video?.filmstrip ?? null,
});

const rangeAt = (values: Readonly<SettingsValues>, path: string): VideoRangeValue | null => {
  const value = valueAtPath(values, path) as Partial<VideoRangeValue> | undefined;
  return typeof value?.startSec === 'number' && typeof value.endSec === 'number'
    ? { startSec: value.startSec, endSec: value.endSec }
    : null;
};

/**
 * Video slots and the fragments chosen from them: a new video starts with the default
 * fragment, and a stored fragment is kept inside the video and the template's limits.
 */
export const useComposeVideoRanges = ({
  template,
  sections,
  values,
  setFieldValue,
  media,
  assets,
}: ComposeVideoRangesDeps): ComposeVideoRangesState => {
  const defaults = resolveTemplateDefaults(template);
  const fields = sections.flatMap((section) => section.fields);
  const slots = template.mediaSlots.filter((slot) => slot.kind === 'video' && slot.range !== undefined);

  const assetOf = (slotKey: string): MediaAssetDto | null => {
    const id = media.value[slotKey];
    return typeof id === 'string' ? (assets.value.get(id) ?? null) : null;
  };

  const sources = computed(() =>
    Object.fromEntries(
      slots.map((slot) => {
        const asset = assetOf(slot.key);
        return [slot.range ?? '', asset ? toSource(asset) : null];
      }),
    ),
  );

  for (const slot of slots) {
    const path = slot.range ?? '';
    const field = fields.find((candidate) => candidate.path === path);
    const bounds = field?.kind === 'custom' && field.limits ? field.limits : { min: 0, max: Infinity };
    const preferred = rangeAt(defaults, path)?.endSec ?? bounds.min;
    watch(
      () => {
        const asset = assetOf(slot.key);
        return asset ? { id: asset.id, durationSec: asset.durationSec ?? 0 } : null;
      },
      (video, previous) => {
        if (!video || video.durationSec <= 0) return;
        const limits: VideoRangeLimits = {
          durationSec: video.durationSec,
          minSec: bounds.min,
          maxSec: bounds.max,
        };
        const current = rangeAt(values, path);
        // A newly picked video (not the one restored with the draft) starts from the top.
        const next =
          previous && previous.id !== video.id
            ? initialVideoRange(limits, preferred)
            : clampVideoRange(current ?? initialVideoRange(limits, preferred), limits);
        if (!current || !isSameRange(current, next)) setFieldValue(path, next);
      },
      { immediate: true },
    );
  }

  return { sources };
};
