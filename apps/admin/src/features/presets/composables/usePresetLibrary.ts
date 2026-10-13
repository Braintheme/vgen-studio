import type { StylePresetDto } from '@vgen/shared';
import { computed, type ComputedRef } from 'vue';
import type { ApiRequestError } from '@/queries/errors';
import { MUSIC_PATHS } from '@/lib/music';
import { valueAtPath } from '@/lib/utils';
import { useTemplatesQuery } from '@/queries/catalog';
import { useMusicTracksQuery } from '@/queries/music';
import { usePresetsQuery } from '@/queries/presets';
import type { PresetGroup } from '@/features/presets/types';

export interface PresetLibraryState {
  readonly groups: ComputedRef<readonly PresetGroup[]>;
  readonly isLoading: ComputedRef<boolean>;
  readonly error: ComputedRef<ApiRequestError | null>;
  readonly retry: () => void;
}

const byName = (a: StylePresetDto, b: StylePresetDto): number => a.name.localeCompare(b.name);

/** All style presets, grouped by template (templates in catalog order, then unknown ones). */
export const usePresetLibrary = (): PresetLibraryState => {
  const presetsQuery = usePresetsQuery();
  const templatesQuery = useTemplatesQuery();
  const tracksQuery = useMusicTracksQuery();

  /** Only known once the library has loaded; until then nothing is flagged. */
  const trackMissing = (preset: StylePresetDto): boolean => {
    const tracks = tracksQuery.data.value;
    const trackId = valueAtPath(preset.props, MUSIC_PATHS.trackId);
    return (
      tracks !== undefined && typeof trackId === 'string' && !tracks.some((track) => track.id === trackId)
    );
  };

  const groups = computed<PresetGroup[]>(() => {
    const presets = presetsQuery.data.value ?? [];
    const templates = templatesQuery.data.value ?? [];
    const templateIds = [
      ...templates.map((template) => template.id),
      ...presets.map((preset) => preset.templateId),
    ].filter((id, index, ids) => ids.indexOf(id) === index);
    return templateIds
      .map((templateId) => {
        const template = templates.find((candidate) => candidate.id === templateId);
        const groupPresets = presets.filter((preset) => preset.templateId === templateId).sort(byName);
        return {
          templateId,
          templateName: template?.name ?? templateId,
          templateVersion: template?.version ?? null,
          presets: groupPresets,
          trackMissingIds: new Set(groupPresets.filter(trackMissing).map((preset) => preset.id)),
        };
      })
      .filter((group) => group.presets.length > 0);
  });

  return {
    groups,
    isLoading: computed(() => presetsQuery.isPending.value || templatesQuery.isPending.value),
    error: computed(() => presetsQuery.error.value ?? templatesQuery.error.value),
    retry: () => {
      void presetsQuery.refetch();
      void templatesQuery.refetch();
    },
  };
};
