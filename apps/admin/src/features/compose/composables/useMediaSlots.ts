import type { MediaAssetDto, MediaInfo, MediaWarning, TemplateDefinition } from '@vgen/shared';
import { computed, reactive, watch, type ComputedRef } from 'vue';
import { useNotify } from '@/composables/useNotify';
import { useMediaAssets, useUploadMediaMutation } from '@/queries/media';
import type { DraftMedia } from '@/stores/compose-draft';
import { ACCEPT_BY_SLOT_KIND } from '@/features/compose/constants';
import type { MediaSlotView, SlotActionView } from '@/features/compose/types';

export interface MediaSlotsState {
  readonly slots: ComputedRef<readonly MediaSlotView[]>;
  readonly actions: ComputedRef<readonly SlotActionView[]>;
  /** Template checks on the chosen media (non-blocking). */
  readonly warnings: ComputedRef<readonly MediaWarning[]>;
  /** Assets of all slots, for the preview. */
  readonly assets: ComputedRef<ReadonlyMap<string, MediaAssetDto>>;
  readonly upload: (slotKey: string, files: readonly File[]) => Promise<void>;
  readonly clear: (slotKey: string) => void;
  /** List slots: removes one item / moves an item to another position. */
  readonly removeAt: (slotKey: string, index: number) => void;
  readonly move: (slotKey: string, from: number, to: number) => void;
  readonly runAction: (action: SlotActionView) => void;
  /** Marks empty required slots; true when all are filled. */
  readonly validate: () => boolean;
}

const idsOf = (value: DraftMedia[string] | undefined): string[] =>
  value === null || value === undefined ? [] : typeof value === 'string' ? [value] : [...value];

const toInfo = (asset: MediaAssetDto): MediaInfo => ({
  assetId: asset.id,
  kind: asset.kind,
  mime: asset.mime,
  width: asset.width,
  height: asset.height,
  durationSec: asset.durationSec,
});

/** Media slots of a template: uploads, current assets, slot actions and template checks. */
export const useMediaSlots = (
  template: TemplateDefinition,
  media: ComputedRef<DraftMedia>,
  setMedia: (media: DraftMedia) => void,
  /** Reports an automatic fix (media deleted since the draft was saved). */
  report: (line: string) => void,
): MediaSlotsState => {
  const notify = useNotify();
  const uploadMutation = useUploadMediaMutation();
  // Per-slot upload progress (0..1) and last error.
  const uploads = reactive(new Map<string, number>());
  const errors = reactive(new Map<string, string>());

  const allIds = computed(() => template.mediaSlots.flatMap((slot) => idsOf(media.value[slot.key])));
  const { assets, missingIds } = useMediaAssets(allIds);

  // Drafts may point at media deleted since, or at a file of the wrong kind: drop those.
  const kindMismatches = computed(() =>
    template.mediaSlots.flatMap((slot) =>
      idsOf(media.value[slot.key]).filter((id) => {
        const asset = assets.value.get(id);
        return asset !== undefined && asset.kind !== slot.kind;
      }),
    ),
  );
  watch(
    () => [...missingIds.value, ...kindMismatches.value],
    (invalid) => {
      if (invalid.length === 0) return;
      const drop = new Set(invalid);
      setMedia(
        Object.fromEntries(
          Object.entries(media.value).map(([key, value]) => [
            key,
            typeof value === 'string'
              ? drop.has(value)
                ? null
                : value
              : (value?.filter((id) => !drop.has(id)) ?? null),
          ]),
        ),
      );
      report('Deleted media were removed from the slots.');
    },
  );

  const slots = computed<MediaSlotView[]>(() =>
    template.mediaSlots.map((slot) => ({
      key: slot.key,
      kind: slot.kind,
      label: slot.label,
      description: slot.description ?? null,
      required: slot.required,
      multiple: slot.multiple !== undefined,
      maxItems: slot.multiple?.max ?? 1,
      accept: ACCEPT_BY_SLOT_KIND[slot.kind],
      assets: idsOf(media.value[slot.key])
        .map((id) => assets.value.get(id))
        .filter((asset): asset is MediaAssetDto => asset !== undefined),
      uploadProgress: uploads.get(slot.key) ?? null,
      error: errors.get(slot.key) ?? null,
    })),
  );

  const actions = computed<SlotActionView[]>(() =>
    (template.ui?.slotActions ?? []).map((action, index) => ({
      id: `${action.type}-${index}`,
      label: action.label,
      slots: action.slots,
      enabled: action.slots.some((key) => idsOf(media.value[key]).length > 0),
    })),
  );

  const warnings = computed<readonly MediaWarning[]>(() => {
    if (!template.checkMedia) return [];
    const infos = Object.fromEntries(
      template.mediaSlots.map((slot) => {
        const found = idsOf(media.value[slot.key])
          .map((id) => assets.value.get(id))
          .filter((asset): asset is MediaAssetDto => asset !== undefined)
          .map(toInfo);
        return [slot.key, slot.multiple ? found : (found[0] ?? null)];
      }),
    );
    return template.checkMedia(infos);
  });

  const upload = async (slotKey: string, files: readonly File[]): Promise<void> => {
    const slot = template.mediaSlots.find((candidate) => candidate.key === slotKey);
    if (!slot || files.length === 0) return;
    // Only what fits is uploaded: a list slot keeps up to `max`, a single slot one file.
    const room = slot.multiple ? Math.max(0, slot.multiple.max - idsOf(media.value[slotKey]).length) : 1;
    const accepted = files.slice(0, room);
    if (accepted.length < files.length) {
      notify.warning(
        `${slot.label}: ${String(accepted.length)} of ${String(files.length)} files added`,
        `This slot holds up to ${String(slot.multiple?.max ?? 1)}.`,
      );
    }
    if (accepted.length === 0) return;
    uploads.set(slotKey, 0);
    errors.delete(slotKey);
    try {
      const uploaded = await uploadMutation.mutateAsync({
        files: accepted,
        onProgress: (fraction) => {
          uploads.set(slotKey, fraction);
        },
      });
      const ids = uploaded.map((asset) => asset.id);
      const next = slot.multiple
        ? [...idsOf(media.value[slotKey]), ...ids].slice(0, slot.multiple.max)
        : (ids[0] ?? null);
      setMedia({ ...media.value, [slotKey]: next });
    } catch (error) {
      errors.set(slotKey, error instanceof Error ? error.message : 'Upload failed');
      notify.error(`Could not upload ${slot.label.toLowerCase()}`, error);
    } finally {
      uploads.delete(slotKey);
    }
  };

  return {
    slots,
    actions,
    warnings,
    assets,
    upload,
    clear: (slotKey) => {
      setMedia({
        ...media.value,
        [slotKey]: template.mediaSlots.find((slot) => slot.key === slotKey)?.multiple ? [] : null,
      });
    },
    removeAt: (slotKey, index) => {
      setMedia({ ...media.value, [slotKey]: idsOf(media.value[slotKey]).filter((_, i) => i !== index) });
    },
    move: (slotKey, from, to) => {
      const ids = idsOf(media.value[slotKey]);
      const [moved] = ids.splice(from, 1);
      if (moved === undefined || to < 0 || to > ids.length) return;
      ids.splice(to, 0, moved);
      setMedia({ ...media.value, [slotKey]: ids });
    },
    runAction: (action) => {
      const [first, second] = action.slots;
      setMedia({
        ...media.value,
        [first]: media.value[second] ?? null,
        [second]: media.value[first] ?? null,
      });
    },
    validate: () => {
      let valid = true;
      for (const slot of template.mediaSlots) {
        if (slot.required && idsOf(media.value[slot.key]).length === 0) {
          errors.set(slot.key, `${slot.label} is required`);
          valid = false;
        }
      }
      return valid;
    },
  };
};
